// Daily job: enforce the privacy policy's "bug reports are kept for up to 6 months, then deleted". Removes "Bug Reports" sheet rows older than 6 months and their
// screenshots in the `qf-bug-screenshots` Blobs store. Rules and safety live in lib/bugRetention.js.
//
// SAFE BY DEFAULT: it only DELETES when the env var BUG_RETENTION_ENABLED is exactly "true". Without it every scheduled run is a DRY RUN: it reads the sheet and
// logs what it would delete (counts only, never report text) and changes nothing. Eric turns deletion on; it is OFF in this PR.
import { getStore } from '@netlify/blobs';
import { getRows, deleteRows } from './lib/sheets.js';
import { runBugRetention } from './lib/bugRetention.js';

export const RETENTION_SCHEDULE = '17 3 * * *';   // daily 03:17 UTC (Netlify reads config.schedule statically, so it must stay a literal; a test pins them equal)
export const config = { schedule: '17 3 * * *' };

const TAB = 'Bug Reports';
const SCREENSHOT_STORE = 'qf-bug-screenshots';

export function retentionEnabled(env = process.env) {
  return env.BUG_RETENTION_ENABLED === 'true';
}

export async function runRetention({ enabled = retentionEnabled(), now = new Date(), getRowsFn = () => getRows(TAB, 'A:E'), deleteRowsFn = (rows) => deleteRows(TAB, rows), deleteBlobFn = (id) => getStore(SCREENSHOT_STORE).delete(id) } = {}) {
  const report = await runBugRetention({ getRowsFn, deleteRowsFn, deleteBlobFn, now, dryRun: !enabled });
  console.log(`[bug-report-retention] ${JSON.stringify(report)}`);
  return report;
}

export default async () => {
  try {
    const report = await runRetention();
    return new Response(JSON.stringify({ ok: true, ...report }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[bug-report-retention] run failed:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
};
