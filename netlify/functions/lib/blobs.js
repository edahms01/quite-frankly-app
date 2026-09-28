import { getStore } from '@netlify/blobs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

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

function cliListAll(storeName) {
  const out = execFileSync('netlify', ['blobs:list', storeName, '--json'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const parsed = JSON.parse(out.toString());
  return parsed.blobs ?? [];
}

export async function getJSON(storeName, key, fallback = null) {
  const store = getStore(storeName);
  const value = await store.get(key, { type: 'json' });
  return value ?? fallback;
}

export async function setJSON(storeName, key, value) {
  if (CLI_FALLBACK) {
    cliSetJSON(storeName, key, value);
    return;
  }
  const store = getStore(storeName);
  await store.setJSON(key, value);
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
