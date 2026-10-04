import { describe, expect, it } from 'vitest';
import { checkPassed, runCheck, shown, testVerdict } from './spec-runner';

describe('runCheck', () => {
  it('passes when the subject returns an equal value', () => {
    expect(runCheck(() => ({ a: 1, b: [2] }), { a: 1, b: [2] })).toEqual({ kind: 'passed' });
  });

  it('reports both values when they differ', () => {
    expect(runCheck(() => 'centre', 'left')).toEqual({
      kind: 'failed',
      expected: "'left'",
      received: "'centre'",
    });
  });

  it('reports a throw as its own outcome', () => {
    expect(
      runCheck(() => {
        throw new Error('broken');
      }, 1),
    ).toEqual({ kind: 'threw', message: 'broken' });
  });
});

describe('testVerdict', () => {
  it('fails a test when any one check fails', () => {
    const outcomes = [runCheck(() => 1, 1), runCheck(() => 2, 1)];

    expect(outcomes.map(checkPassed)).toEqual([true, false]);
    expect(testVerdict(outcomes)).toBe('failed');
    expect(testVerdict([runCheck(() => 1, 1)])).toBe('passed');
  });
});

describe('shown', () => {
  it('writes strings quoted, NaN by name and objects as JSON', () => {
    expect([shown('left'), shown(Number.NaN), shown({ x: 1 }), shown(null)]).toEqual([
      "'left'",
      'NaN',
      '{"x":1}',
      'null',
    ]);
  });
});
