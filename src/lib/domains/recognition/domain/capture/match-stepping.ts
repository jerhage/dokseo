const NO_MATCH = -1;

function clampedIndex(at: number, by: number, total: number): number {
  if (total <= 0) return NO_MATCH;
  if (at < 0) return by < 0 ? total - 1 : 0;
  return Math.min(Math.max(at + by, 0), total - 1);
}

function wrappedIndex(at: number, by: number, total: number): number {
  if (total <= 0) return NO_MATCH;
  const from = at < 0 ? 0 : at % total;
  return (((from + by) % total) + total) % total;
}

function matchOfTotal(at: number, total: number): string {
  return total === 0 ? 'no match' : `match ${at + 1} of ${total}`;
}

export { NO_MATCH, clampedIndex, wrappedIndex, matchOfTotal };
