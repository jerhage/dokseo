import { describe, expect, it } from 'vitest';
import { pointerKinds, shownTurnSettings } from './turn-settings';
import type { MediaMatches } from './turn-settings';

function device(...matching: readonly string[]): MediaMatches {
  return (query) => matching.includes(query);
}

const touchOnly = { touchTurns: true, edgeClicks: false };
const mouseOnly = { touchTurns: false, edgeClicks: true };
const both = { touchTurns: true, edgeClicks: true };

describe('shownTurnSettings', () => {
  it.each([
    ['a phone', device('(any-pointer: coarse)'), 'touch', touchOnly],
    [
      'a touch-only iPad that expects an Apple Pencil',
      device('(any-pointer: coarse)', '(any-pointer: fine)'),
      'touch',
      touchOnly,
    ],
    [
      'an iPad with a trackpad',
      device('(any-pointer: coarse)', '(any-pointer: fine)', '(any-hover: hover)'),
      'touch-and-mouse',
      both,
    ],
    [
      'a desktop with a mouse',
      device('(any-pointer: fine)', '(any-hover: hover)'),
      'mouse',
      mouseOnly,
    ],
    [
      'a laptop with a touch screen and a trackpad',
      device('(any-pointer: coarse)', '(any-pointer: fine)', '(any-hover: hover)'),
      'touch-and-mouse',
      both,
    ],
    [
      'a device that reports no pointer',
      device(),
      'neither',
      {
        touchTurns: false,
        edgeClicks: false,
      },
    ],
  ])(
    'names the pointers of %s and shows the turn settings it can use',
    (_name, matches, kinds, shown) => {
      expect(pointerKinds(matches)).toBe(kinds);
      expect(shownTurnSettings(matches)).toEqual(shown);
    },
  );
});
