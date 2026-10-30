#!/usr/bin/env node
// READ-ONLY dry run of the bug-report retention job against the real sheet: one Sheets GET of "Bug Reports" A:E, prints COUNTS only (never report text or ids).
// Needs the site env (GOOGLE_SERVICE_ACCOUNT_JSON_B64, SHEETS_SPREADSHEET_ID...), e.g.:  cd <linked checkout> && npx netlify dev:exec node <path>/scripts/bug-retention-dry-run.mjs
// It can never delete: it calls runBugRetention with dryRun:true and no delete callbacks.
import { getRows } from '../netlify/functions/lib/sheets.js';
import { runBugRetention } from '../netlify/functions/lib/bugRetention.js';

const report = await runBugRetention({
  getRowsFn: () => getRows('Bug Reports', 'A:E'),
  deleteBlobFn: async () => { throw new Error('dry run: no deletes'); },
  deleteRowsFn: async () => { throw new Error('dry run: no deletes'); },
  dryRun: true,
});
console.log(JSON.stringify(report, null, 2));
