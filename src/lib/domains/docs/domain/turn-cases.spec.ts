import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TURN_CASES, checkTurnCase, settingsText } from './turn-cases';

const SPEC = readFileSync('src/lib/shared/turn-settings.spec.ts', 'utf8');

describe('the recorded turn settings cases', () => {
  it('passes every case against the real shownTurnSettings', () => {
    expect(TURN_CASES.map(checkTurnCase).every((outcome) => outcome.kind === 'passed')).toBe(true);
  });

  it.each(TURN_CASES.map((turnCase) => [turnCase.name] as const))(
    'names %s as the real spec does',
    (name) => {
      expect(SPEC).toContain(`'${name}'`);
    },
  );

  it('fails a case whose expectation is changed', () => {
    const [phone] = TURN_CASES;
    if (phone === undefined) throw new Error('No first case');

    expect(checkTurnCase({ ...phone, expected: { touchTurns: true, edgeClicks: true } })).toEqual({
      kind: 'failed',
      expected: '{"touchTurns":true,"edgeClicks":true}',
      received: '{"touchTurns":true,"edgeClicks":false}',
    });
  });

  it('names the settings a case shows in words', () => {
    expect(settingsText({ touchTurns: true, edgeClicks: true })).toBe(
      'touch turns and edge clicks',
    );
    expect(settingsText({ touchTurns: false, edgeClicks: false })).toBe('neither');
  });
});
