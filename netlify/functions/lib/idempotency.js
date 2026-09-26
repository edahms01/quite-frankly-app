export function filterNewByKey(existingKeys, candidates, keyFn) {
  const existing = new Set(existingKeys);
  return candidates.filter((candidate) => !existing.has(keyFn(candidate)));
}

// existingRows: output of sheets.js's getColumnWithRows() for the dedupe
// column — an array of { row, value }. candidates: the new/updated items
// to write. keyFn(candidate): extracts the dedupe key from a candidate.
// toRowValues(candidate): builds the full row array (A..last column) for
// a candidate, used identically for both insert and update paths.
//
// Returns { toInsert: values[][], toUpdate: [{row, values}] } —
// toInsert feeds sheets.js's appendRows() directly, toUpdate feeds
// sheets.js's updateRows() directly. No further shaping needed by callers.
export function partitionForUpsert(existingRows, candidates, keyFn, toRowValues) {
  const rowByKey = new Map(existingRows.map(({ row, value }) => [value, row]));
  const toInsert = [];
  const toUpdate = [];
  for (const candidate of candidates) {
    const key = keyFn(candidate);
    const row = rowByKey.get(key);
    if (row === undefined) {
      toInsert.push(toRowValues(candidate));
    } else {
      toUpdate.push({ row, values: toRowValues(candidate) });
    }
  }
  return { toInsert, toUpdate };
}
