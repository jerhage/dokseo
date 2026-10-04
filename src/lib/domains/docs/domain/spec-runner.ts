import { match } from 'ts-pattern';

type CheckOutcome =
  | { readonly kind: 'passed' }
  | { readonly kind: 'failed'; readonly expected: string; readonly received: string }
  | { readonly kind: 'threw'; readonly message: string };

type TestVerdict = 'passed' | 'failed';

function shown(value: unknown): string {
  if (typeof value === 'string') return `'${value}'`;
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  return JSON.stringify(value) ?? String(value);
}

function runCheck<T>(subject: () => T, expected: T): CheckOutcome {
  try {
    const received = subject();
    return shown(received) === shown(expected)
      ? { kind: 'passed' }
      : { kind: 'failed', expected: shown(expected), received: shown(received) };
  } catch (cause) {
    return { kind: 'threw', message: cause instanceof Error ? cause.message : String(cause) };
  }
}

function checkPassed(outcome: CheckOutcome): boolean {
  return match(outcome)
    .with({ kind: 'passed' }, () => true)
    .with({ kind: 'failed' }, { kind: 'threw' }, () => false)
    .exhaustive();
}

function testVerdict(outcomes: readonly CheckOutcome[]): TestVerdict {
  return outcomes.every(checkPassed) ? 'passed' : 'failed';
}

export { checkPassed, runCheck, shown, testVerdict };
export type { CheckOutcome, TestVerdict };
