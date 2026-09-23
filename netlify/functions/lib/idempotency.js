export function filterNewByKey(existingKeys, candidates, keyFn) {
  const existing = new Set(existingKeys);
  return candidates.filter((candidate) => !existing.has(keyFn(candidate)));
}
