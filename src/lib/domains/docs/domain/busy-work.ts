type FrameSummary = { readonly frames: number; readonly longestGapMs: number };

const PRIMES_BELOW = 6_000_000;

function countPrimes(below: number): number {
  let count = 0;
  for (let candidate = 2; candidate < below; candidate += 1) {
    let prime = true;
    for (let divisor = 2; divisor * divisor <= candidate; divisor += 1) {
      if (candidate % divisor === 0) {
        prime = false;
        break;
      }
    }
    if (prime) count += 1;
  }
  return count;
}

function frameSummary(times: readonly number[]): FrameSummary {
  let longestGapMs = 0;
  for (let index = 1; index < times.length; index += 1) {
    longestGapMs = Math.max(longestGapMs, (times[index] ?? 0) - (times[index - 1] ?? 0));
  }
  return { frames: times.length, longestGapMs };
}

export { PRIMES_BELOW, countPrimes, frameSummary };
export type { FrameSummary };
