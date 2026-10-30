// Bug-report retention: the privacy policy promises bug reports "are kept for up to 6 months and are then deleted". This module decides WHICH rows are
// past that and builds the Sheets delete requests; poll-free, pure and node --test covered. The scheduled function (bug-report-retention.js) wires it to Sheets + Blobs.
// Tab "Bug Reports", columns written by report-bug.js: A timestamp (ISO), B title, C description, D screenshot URL (".../get-bug-screenshot?id=<uuid>"), E device info.

export const RETENTION_MONTHS = 6;
// Safety cap: one run never deletes more than this many rows. A bigger number means something is wrong (a bad clock, a re-imported sheet), so it stops and reports.
export const MAX_DELETE_PER_RUN = 200;

/** The instant 6 calendar months before `now` (UTC). Reports strictly older than this are expired. */
export function retentionCutoff(now = new Date(), months = RETENTION_MONTHS) {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

/**
 * Column A as a time (ms), or NaN. Accepts the app's ISO form ("2026-10-06T14:00:00.000Z") and a hand-typed "2026-10-06 14:00" (seen in the live sheet); a value with no
 * zone is read as UTC. Anything else (header, note, blank) is NaN, so it is never deleted.
 */
export function parseTimestamp(raw) {
  if (typeof raw !== 'string') return NaN;
  const v = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/.test(v)) return NaN;
  const iso = v.replace(' ', 'T');
  return Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`);
}

/** The screenshot blob id from a stored URL, or null (no screenshot / not our URL). Only a plain uuid-ish id is accepted so a hand-edited cell can never address another key. */
export function screenshotIdFromUrl(url) {
  if (typeof url !== 'string' || !url) return null;
  try {
    const id = new URL(url).searchParams.get('id');
    return id && /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * rows: raw sheet rows from range A:E INCLUDING row 1 (sheet row number = index + 1).
 * Returns { expired: [{ row, timestamp, screenshotId }], keptCount, skipped: [{ row, reason }] }.
 * A row is expired only if its A cell is a valid ISO timestamp strictly older than the cutoff. A header, blank or unparsable row is NEVER deleted (reported as skipped).
 */
export function selectExpired(rows, now = new Date(), months = RETENTION_MONTHS) {
  const cutoff = retentionCutoff(now, months).getTime();
  const expired = [];
  const skipped = [];
  let keptCount = 0;
  (rows || []).forEach((cells, i) => {
    const row = i + 1;
    const raw = Array.isArray(cells) ? cells[0] : undefined;
    const t = parseTimestamp(raw);
    if (!Number.isFinite(t)) {
      skipped.push({ row, reason: row === 1 ? 'header or non-timestamp first row' : 'no valid timestamp in column A' });
      return;
    }
    if (t < cutoff) expired.push({ row, timestamp: raw.trim(), screenshotId: screenshotIdFromUrl(cells[3]) });
    else keptCount += 1;
  });
  return { expired, keptCount, skipped };
}

/** Sheets spreadsheet-level batchUpdate requests that delete the given 1-based sheet rows. Contiguous rows are merged; ranges are emitted from the BOTTOM up so earlier deletions never shift later ones. */
export function buildDeleteRowRequests(sheetId, rowNumbers) {
  const rows = [...new Set(rowNumbers)].filter((n) => Number.isInteger(n) && n >= 2).sort((a, b) => b - a);   // never row 1
  const ranges = [];
  for (const r of rows) {
    const last = ranges[ranges.length - 1];
    if (last && r === last.startIndex) { last.startIndex = r - 1; continue; }   // r (1-based) sits directly above the range start (0-based startIndex = first row's 1-based - 1)
    ranges.push({ startIndex: r - 1, endIndex: r });
  }
  return ranges.map(({ startIndex, endIndex }) => ({
    deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex, endIndex } },
  }));
}

/**
 * Orchestrator. Everything external is injected so it is testable.
 *  getRowsFn() -> rows (A:E incl. header), deleteBlobFn(id), deleteRowsFn(rowNumbers) (bottom-up handled by the caller of the Sheets API via buildDeleteRowRequests).
 *  dryRun (default TRUE): read-only, reports what WOULD be deleted. Real deletion needs dryRun === false explicitly.
 * Order when really deleting: screenshots first, rows second. If a blob delete fails the row is kept and retried next run (so no orphan blob is ever forgotten);
 * a row delete that fails after its blob is gone only leaves a dead link, which the next run retries.
 */
export async function runBugRetention({ getRowsFn, deleteBlobFn, deleteRowsFn, now = new Date(), dryRun = true, maxDelete = MAX_DELETE_PER_RUN } = {}) {
  const rows = await getRowsFn();
  const { expired, keptCount, skipped } = selectExpired(rows, now);
  const report = {
    dryRun,
    cutoff: retentionCutoff(now).toISOString(),
    rowsRead: rows.length,
    expiredRows: expired.length,
    expiredWithScreenshot: expired.filter((e) => e.screenshotId).length,
    keptRows: keptCount,
    skippedRows: skipped.length,
    oldest: expired[0]?.timestamp ?? null,
    deletedRows: 0,
    deletedScreenshots: 0,
    failedScreenshots: 0,
    aborted: null,
  };
  if (expired.length === 0) return report;
  if (expired.length > maxDelete) {
    report.aborted = `would delete ${expired.length} rows, over the safety cap of ${maxDelete}; nothing deleted`;
    return report;
  }
  if (dryRun) return report;

  const rowsToDelete = [];
  for (const e of expired) {
    if (e.screenshotId) {
      try {
        await deleteBlobFn(e.screenshotId);
        report.deletedScreenshots += 1;
      } catch {
        report.failedScreenshots += 1;
        continue;   // keep the row so the next run retries this screenshot
      }
    }
    rowsToDelete.push(e.row);
  }
  if (rowsToDelete.length > 0) {
    await deleteRowsFn(rowsToDelete);
    report.deletedRows = rowsToDelete.length;
  }
  return report;
}
