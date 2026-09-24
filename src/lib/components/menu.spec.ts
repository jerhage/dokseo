import { describe, expect, it } from 'vitest';
import { menuOpening } from './menu';

describe('menuOpening', () => {
  it('opens onto the first item with the down arrow', () => {
    expect(menuOpening('ArrowDown')).toBe('first');
  });

  it('opens onto the last item with the up arrow', () => {
    expect(menuOpening('ArrowUp')).toBe('last');
  });

  it('leaves the menu shut for any other key', () => {
    expect([menuOpening('Home'), menuOpening('Escape'), menuOpening('constructor')]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});
