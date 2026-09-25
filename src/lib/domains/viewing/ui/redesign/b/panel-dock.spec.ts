import { describe, expect, it } from 'vitest';
import { dockPlacement, dockToggle, isNarrow } from './panel-dock';

describe('isNarrow', () => {
  it('calls a body narrower than the compact breakpoint narrow', () => {
    expect(isNarrow(390, 700)).toBe(true);
  });

  it('calls a body at or past the breakpoint wide', () => {
    expect(isNarrow(700, 700)).toBe(false);
    expect(isNarrow(1440, 700)).toBe(false);
  });

  it('calls nothing narrow before either width is measured', () => {
    expect(isNarrow(0, 700)).toBe(false);
    expect(isNarrow(390, 0)).toBe(false);
  });
});

describe('dockPlacement', () => {
  it('opens the panel beside the page on a wide screen until asked otherwise', () => {
    expect(dockPlacement(false, null)).toBe('side');
  });

  it('leaves the panel as a peek below the page on a narrow screen until asked', () => {
    expect(dockPlacement(true, null)).toBe('peek');
  });

  it('follows the reader who closed it on a wide screen', () => {
    expect(dockPlacement(false, false)).toBe('rail');
  });

  it('follows the reader who opened it on a narrow screen', () => {
    expect(dockPlacement(true, true)).toBe('sheet');
  });
});

describe('dockToggle', () => {
  it('offers to hide an open panel and to show a closed one', () => {
    expect(dockToggle('side')).toMatchObject({ open: true, label: 'Hide captures' });
    expect(dockToggle('sheet')).toMatchObject({ open: true, label: 'Hide captures' });
    expect(dockToggle('rail')).toMatchObject({ open: false, label: 'Show captures' });
    expect(dockToggle('peek')).toMatchObject({ open: false, label: 'Show captures' });
  });

  it('points each glyph the way the panel will move', () => {
    expect(dockToggle('side').glyph).toBe('›');
    expect(dockToggle('rail').glyph).toBe('‹');
    expect(dockToggle('sheet').glyph).toBe('▾');
    expect(dockToggle('peek').glyph).toBe('▴');
  });
});
