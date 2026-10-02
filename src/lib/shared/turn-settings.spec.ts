import { describe, expect, it } from 'vitest';
import { pointerKinds, shownTurnSettings } from './turn-settings';

describe('shownTurnSettings', () => {
  it.each([
    ['a touch-only device', true, false, 'touch', { touchTurns: true, edgeClicks: false }],
    ['a mouse-only device', false, true, 'fine', { touchTurns: false, edgeClicks: true }],
    [
      'a device with a touch screen and a mouse',
      true,
      true,
      'touch-and-fine',
      { touchTurns: true, edgeClicks: true },
    ],
    [
      'a device that reports no pointer',
      false,
      false,
      'neither',
      { touchTurns: false, edgeClicks: false },
    ],
  ])(
    'names the pointers of %s and shows the turn settings it can use',
    (_name, coarse, fine, kinds, shown) => {
      expect(pointerKinds(coarse, fine)).toBe(kinds);
      expect(shownTurnSettings(coarse, fine)).toEqual(shown);
    },
  );
});
