import { describe, expect, it } from 'vitest';
import { menuOpening } from './menu';

describe('menuOpening', () => {
  it.each([
    ['ArrowDown', 'first'],
    ['ArrowUp', 'last'],
    ['Home', undefined],
    ['Escape', undefined],
    ['constructor', undefined],
  ])('opens a menu on %s onto %s', (key, opening) => {
    expect(menuOpening(key)).toBe(opening);
  });
});
