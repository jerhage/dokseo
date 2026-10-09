import { describe, expect, it } from 'vitest';
import { grabPress } from './grab-press';
import type { GrabPress } from './grab-press';

describe('grabPress', () => {
  it.each<{
    readonly button: number;
    readonly isPrimary: boolean;
    readonly space: boolean;
    readonly answer: GrabPress;
  }>([
    { button: 1, isPrimary: true, space: false, answer: { kind: 'grab', bySpace: false } },
    { button: 1, isPrimary: false, space: true, answer: { kind: 'grab', bySpace: false } },
    { button: 0, isPrimary: true, space: true, answer: { kind: 'grab', bySpace: true } },
    { button: 0, isPrimary: true, space: false, answer: { kind: 'select' } },
    { button: 2, isPrimary: true, space: true, answer: { kind: 'ignore' } },
    { button: 0, isPrimary: false, space: true, answer: { kind: 'ignore' } },
    { button: 0, isPrimary: false, space: false, answer: { kind: 'ignore' } },
  ])(
    'answers $answer.kind for button $button, primary $isPrimary, space held $space',
    ({ button, isPrimary, space, answer }) => {
      expect(grabPress({ button, isPrimary }, space)).toEqual(answer);
    },
  );
});
