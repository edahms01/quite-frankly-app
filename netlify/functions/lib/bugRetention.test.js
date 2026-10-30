import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAX_DELETE_PER_RUN, buildDeleteRowRequests, parseTimestamp, retentionCutoff, runBugRetention, screenshotIdFromUrl, selectExpired,
} from './bugRetention.js';
import { RETENTION_SCHEDULE, config, retentionEnabled, runRetention } from '../bug-report-retention.js';

const NOW = new Date('2026-10-30T12:00:00.000Z');
const URL_A = 'https://quite-frankly-app.netlify.app/.netlify/functions/get-bug-screenshot?id=11111111-2222-3333-4444-555555555555';
const header = ['Timestamp', 'Title', 'Description', 'Screenshot', 'Device'];
const row = (ts, shot = '') => [ts, 't', 'd', shot, 'android 36'];

test('cutoff is 6 calendar months back (UTC)', () => {
  assert.equal(retentionCutoff(NOW).toISOString(), '2026-04-30T12:00:00.000Z');
  assert.equal(retentionCutoff(new Date('2026-08-31T00:00:00.000Z')).toISOString().slice(0, 7), '2026-03');   // month-end rollover: Feb 31 -> Mar 3, never earlier than 6 months back
});

test('only reports strictly older than the cutoff are expired; a header, blank or unparsable row is never deleted', () => {
  const rows = [header, row('2026-04-30T11:59:59.000Z', URL_A), row('2026-04-30T12:00:00.000Z'), row('2026-10-29T00:00:00.000Z'), [], ['manual note'], row('not a date'), row('2025-01-01T00:00:00.000Z')];
  const r = selectExpired(rows, NOW);
  assert.deepEqual(r.expired.map((e) => e.row), [2, 8]);
  assert.equal(r.expired[0].screenshotId, '11111111-2222-3333-4444-555555555555');
  assert.equal(r.expired[1].screenshotId, null);
  assert.equal(r.keptCount, 2);
  assert.deepEqual(r.skipped.map((s) => s.row), [1, 5, 6, 7]);
  assert.deepEqual(selectExpired([], NOW).expired, []);
  assert.deepEqual(selectExpired(undefined, NOW).expired, []);
});

test('timestamps: ISO and the hand-typed "YYYY-MM-DD HH:MM" (live sheet row 2) both parse, as UTC when no zone; everything else is NaN', () => {
  assert.equal(parseTimestamp('2026-10-06T14:00:00.000Z'), Date.parse('2026-10-06T14:00:00.000Z'));
  assert.equal(parseTimestamp('2026-10-06 14:00'), Date.parse('2026-10-06T14:00:00Z'));
  assert.equal(parseTimestamp(' 2026-10-06 14:00:30 '), Date.parse('2026-10-06T14:00:30Z'));
  assert.equal(parseTimestamp('2026-10-06T14:00:00+02:00'), Date.parse('2026-10-06T12:00:00Z'));
  for (const bad of ['Timestamp', '', 'Notes: see below', '10/6/2026 14:00', '2026-13-45 99:99', undefined, null, 5]) assert.ok(Number.isNaN(parseTimestamp(bad)), String(bad));
  const r = selectExpired([['Timestamp'], ['2025-01-02 09:30', '', '', '', ''], ['2026-10-06 14:00']], NOW);
  assert.deepEqual(r.expired.map((e) => e.row), [2]);
  assert.equal(r.keptCount, 1);
});

test('screenshot id comes only from a plain id; anything odd is ignored', () => {
  assert.equal(screenshotIdFromUrl(URL_A), '11111111-2222-3333-4444-555555555555');
  for (const bad of ['', undefined, null, 'https://x.test/?id=../../etc', 'https://x.test/?id=a b', 'https://x.test/?id=short', 'not a url', 'https://x.test/']) assert.equal(screenshotIdFromUrl(bad), null, String(bad));
});

test('delete requests: bottom-up, contiguous rows merged, row 1 and junk never included', () => {
  const reqs = buildDeleteRowRequests(42, [3, 6, 7, 1, 0, 2.5, 7, 'x']);
  assert.deepEqual(reqs.map((r) => [r.deleteDimension.range.startIndex, r.deleteDimension.range.endIndex]), [[5, 7], [2, 3]]);
  assert.ok(reqs.every((r) => r.deleteDimension.range.sheetId === 42 && r.deleteDimension.range.dimension === 'ROWS'));
  assert.deepEqual(buildDeleteRowRequests(1, []), []);
  assert.deepEqual(buildDeleteRowRequests(1, [1]), []);
});

const mk = (rows) => {
  const calls = { blobs: [], rows: null };
  return { calls, opts: { getRowsFn: async () => rows, deleteBlobFn: async (id) => { calls.blobs.push(id); }, deleteRowsFn: async (r) => { calls.rows = r; }, now: NOW } };
};

test('DRY RUN (the default) reports counts and deletes nothing', async () => {
  const { calls, opts } = mk([header, row('2025-01-01T00:00:00.000Z', URL_A), row('2026-10-01T00:00:00.000Z')]);
  const r = await runBugRetention(opts);
  assert.equal(r.dryRun, true);
  assert.deepEqual({ rowsRead: r.rowsRead, expiredRows: r.expiredRows, expiredWithScreenshot: r.expiredWithScreenshot, keptRows: r.keptRows, deletedRows: r.deletedRows }, { rowsRead: 3, expiredRows: 1, expiredWithScreenshot: 1, keptRows: 1, deletedRows: 0 });
  assert.deepEqual(calls.blobs, []);
  assert.equal(calls.rows, null);
});

test('real run (dryRun:false): screenshots first, then the rows', async () => {
  const { calls, opts } = mk([header, row('2025-01-01T00:00:00.000Z', URL_A), row('2025-02-01T00:00:00.000Z'), row('2026-10-01T00:00:00.000Z')]);
  const r = await runBugRetention({ ...opts, dryRun: false });
  assert.deepEqual(calls.blobs, ['11111111-2222-3333-4444-555555555555']);
  assert.deepEqual(calls.rows, [2, 3]);
  assert.equal(r.deletedRows, 2);
  assert.equal(r.deletedScreenshots, 1);
});

test('a screenshot that fails to delete keeps its row for the next run', async () => {
  const rows = [header, row('2025-01-01T00:00:00.000Z', URL_A), row('2025-02-01T00:00:00.000Z')];
  let deleted = null;
  const r = await runBugRetention({ getRowsFn: async () => rows, deleteBlobFn: async () => { throw new Error('blobs down'); }, deleteRowsFn: async (x) => { deleted = x; }, now: NOW, dryRun: false });
  assert.deepEqual(deleted, [3]);
  assert.equal(r.failedScreenshots, 1);
  assert.equal(r.deletedRows, 1);
});

test('nothing expired = nothing to do; over the safety cap = abort without deleting', async () => {
  assert.equal((await runBugRetention(mk([header, row('2026-10-01T00:00:00.000Z')]).opts)).expiredRows, 0);
  const many = [header, ...Array.from({ length: MAX_DELETE_PER_RUN + 1 }, () => row('2025-01-01T00:00:00.000Z'))];
  const { calls, opts } = mk(many);
  const r = await runBugRetention({ ...opts, dryRun: false });
  assert.match(r.aborted, /safety cap/);
  assert.equal(calls.rows, null);
  assert.deepEqual(calls.blobs, []);
});

test('the scheduled function deletes only when BUG_RETENTION_ENABLED is exactly "true"; otherwise it is a dry run', async () => {
  assert.equal(retentionEnabled({}), false);
  for (const v of ['1', 'TRUE', 'yes', 'false', '']) assert.equal(retentionEnabled({ BUG_RETENTION_ENABLED: v }), false, v);
  assert.equal(retentionEnabled({ BUG_RETENTION_ENABLED: 'true' }), true);
  const rows = [header, row('2025-01-01T00:00:00.000Z', URL_A)];
  let touched = false;
  const off = await runRetention({ enabled: false, now: NOW, getRowsFn: async () => rows, deleteRowsFn: async () => { touched = true; }, deleteBlobFn: async () => { touched = true; } });
  assert.equal(off.dryRun, true);
  assert.equal(touched, false);
  const on = await runRetention({ enabled: true, now: NOW, getRowsFn: async () => rows, deleteRowsFn: async () => { touched = true; }, deleteBlobFn: async () => {} });
  assert.equal(on.dryRun, false);
  assert.equal(touched, true);
});

test('schedule is a daily literal that matches the exported constant', () => {
  assert.equal(config.schedule, RETENTION_SCHEDULE);
  assert.match(RETENTION_SCHEDULE, /^\d+ \d+ \* \* \*$/);
  assert.match(readFileSync(new URL('../bug-report-retention.js', import.meta.url), 'utf8'), /export const config = \{ schedule: '17 3 \* \* \*' \}/);
});
