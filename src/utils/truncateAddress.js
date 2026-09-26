// Standard crypto-address display shorthand: first 4 chars, "...", last 4
// chars. Display only — callers keep copying the full untruncated value.
export function truncateAddress(address) {
  if (address.length <= 11) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
