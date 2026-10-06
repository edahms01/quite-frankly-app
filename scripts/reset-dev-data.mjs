// "Reset dev data": wipes everything personal the app backend holds, once, before the first store release (the app has no real users yet).
//   node scripts/reset-dev-data.mjs         -> prints how many entries each store has, changes NOTHING
//   node scripts/reset-dev-data.mjs --yes   -> prints the counts, THEN deletes every entry in these stores
// Stores wiped: qf-sessions, qf-session-index, qf-otp, qf-push-tokens, qf-rate. Content caches (blog, newsletter, youtube, ...), bug reports and qf-flags are NOT touched.
// Run ONLY when Eric says "reset dev data". Uses the logged-in `netlify` CLI against the linked site (run `netlify status` first): no token is handled here.
import { execFileSync } from 'node:child_process';

const STORES = ['qf-sessions', 'qf-session-index', 'qf-otp', 'qf-push-tokens', 'qf-rate'];
const wipe = process.argv.includes('--yes');

const keysOf = (store) => {
  const out = execFileSync('netlify', ['blobs:list', store, '--json'], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  const parsed = JSON.parse(out.toString());
  return (Array.isArray(parsed) ? parsed : parsed.blobs ?? []).map((b) => (typeof b === 'string' ? b : b.key));
};

const found = {};
for (const s of STORES) { found[s] = keysOf(s); console.log(`${s}: ${found[s].length} entr${found[s].length === 1 ? 'y' : 'ies'}`); }
if (!wipe) { console.log('\nNothing deleted. Re-run with --yes to delete all of the above.'); process.exit(0); }

let deleted = 0;
for (const s of STORES) {
  for (const k of found[s]) { execFileSync('netlify', ['blobs:delete', s, k, '--force'], { stdio: 'pipe' }); deleted += 1; }
  const left = keysOf(s).length;
  console.log(`${s}: deleted, ${left} left`);
}
console.log(`\nDeleted ${deleted} entries.`);
