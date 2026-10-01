import { getStore } from '@netlify/blobs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { retryAsync } from './fetchWithBackoff.js';

// Opt-in fallback for a bare `netlify dev:exec -- node <script>` one-off
// script context, where @netlify/blobs's zero-arg getStore() has no
// runtime-injected siteID/token to work with (dev:exec only injects env
// vars, not the Blobs runtime context a real deployed Function gets) and
// throws "The environment has not been configured to use Netlify Blobs."
// @netlify/blobs supports passing siteID/token manually, but assembling a
// raw API token ourselves would mean this script (or this module) holding
// a secret credential -- instead this shells out to the already-logged-in
// `netlify` CLI, which resolves its own auth locally and never exposes a
// token to this process. Fully additive and off by default: every existing
// in-Function caller (poll-youtube.js, poll-soundcloud.js, twitch-webhook.js,
// etc.) keeps using zero-arg getStore() exactly as before, since this only
// activates when a caller explicitly sets NETLIFY_BLOBS_CLI_FALLBACK=1 --
// intended for one-off scripts run via dev:exec, never set in a deployed
// Function's environment.
const CLI_FALLBACK = process.env.NETLIFY_BLOBS_CLI_FALLBACK === '1';

function cliSetJSON(storeName, key, value) {
  const tmpFile = join(tmpdir(), `blobs-cli-${randomUUID()}.json`);
  writeFileSync(tmpFile, JSON.stringify(value));
  try {
    execFileSync('netlify', ['blobs:set', storeName, key, '--input', tmpFile, '--force'], {
      stdio: 'pipe',
    });
  } finally {
    unlinkSync(tmpFile);
  }
}

// Read counterpart to cliSetJSON, same opt-in CLI_FALLBACK path. Writes to a
// temp file via --output (a large blob would overflow execFileSync's default
// stdout buffer). A missing key, or anything that isn't valid JSON, yields
// null so getJSON falls back to its `fallback` arg exactly as store.get does.
function cliGetJSON(storeName, key) {
  const tmpFile = join(tmpdir(), `blobs-cli-${randomUUID()}.json`);
  try {
    execFileSync('netlify', ['blobs:get', storeName, key, '--output', tmpFile], {
      stdio: 'pipe',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (!existsSync(tmpFile)) return null;
    const text = readFileSync(tmpFile, 'utf8');
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } finally {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  }
}

function cliListAll(storeName) {
  const out = execFileSync('netlify', ['blobs:list', storeName, '--json'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const parsed = JSON.parse(out.toString());
  return parsed.blobs ?? [];
}

// `retryConfig` (maxAttempts/baseMs/sleepFn/etc., same shape fetchWithBackoff
// takes) is an injectable last-arg options object, purely a test seam --
// every real caller (poll-blog.js, get-blog-posts.js, squarespaceBlog.js)
// keeps calling with just (storeName, key, fallback), unchanged, and gets
// retryAsync's real timing. Added after a live "can't load text right now"
// report on individual articles turned out NOT to be the same Sheets-retry
// gap fixed earlier (`?id=` mode never touches Sheets) -- getJSON/setJSON
// had no retry wrapping at all, unlike the Sheets read functions, so a
// single transient Blobs read/write failure surfaced directly with no
// retry. `storeFactory` (default: the real `getStore`) is the other test
// seam, letting tests inject a fake Store without real Blobs credentials.
// `cliFallback`/`cliGetFn` are test seams for the CLI_FALLBACK read path
// (default: the module-level env flag and the real `netlify blobs:get` shim).
export async function getJSON(
  storeName,
  key,
  fallback = null,
  { storeFactory = getStore, cliFallback = CLI_FALLBACK, cliGetFn = cliGetJSON, ...retryConfig } = {}
) {
  if (cliFallback) {
    const value = cliGetFn(storeName, key);
    return value ?? fallback;
  }
  const store = storeFactory(storeName);
  const value = await retryAsync(() => store.get(key, { type: 'json' }), retryConfig);
  return value ?? fallback;
}

export async function setJSON(storeName, key, value, { storeFactory = getStore, ...retryConfig } = {}) {
  if (CLI_FALLBACK) {
    cliSetJSON(storeName, key, value);
    return;
  }
  const store = storeFactory(storeName);
  await retryAsync(() => store.setJSON(key, value), retryConfig);
}

export async function deleteKey(storeName, key) {
  const store = getStore(storeName);
  await store.delete(key);
}

// `.list()` is the only Store method the CLI-fallback shim needs to support
// (used by scripts/backfill-blog.mjs's countBlobs parity check) -- callers
// needing other Store methods under CLI_FALLBACK would need this extended.
export function blobStore(storeName) {
  if (CLI_FALLBACK) {
    return {
      async list() {
        return { blobs: cliListAll(storeName), cursor: undefined };
      },
    };
  }
  return getStore(storeName);
}
