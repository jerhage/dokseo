import { describe, expect, it } from 'vitest';
import { dockName, dockPlacement, dockTally, dockToggle, isNarrow } from './panel-dock';

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

  it('points each arrow the way the panel will move', () => {
    expect(dockToggle('side').points).toBe('right');
    expect(dockToggle('rail').points).toBe('left');
    expect(dockToggle('sheet').points).toBe('down');
    expect(dockToggle('peek').points).toBe('up');
  });
});

describe('dockTally', () => {
  it('shows the count on a closed panel', () => {
    expect(dockTally('rail', 3)).toBe(3);
    expect(dockTally('peek', 3)).toBe(3);
  });

  it('hides the count while the panel is open', () => {
    expect(dockTally('side', 3)).toBeNull();
    expect(dockTally('sheet', 3)).toBeNull();
  });

  it('shows no count when there are no captures or none are known', () => {
    expect(dockTally('rail', 0)).toBeNull();
    expect(dockTally('peek', null)).toBeNull();
  });
});

describe('dockName', () => {
  it('names the action and the count of a closed panel', () => {
    expect(dockName('rail', 3)).toBe('Show captures, 3');
    expect(dockName('peek', 12)).toBe('Show captures, 12');
  });

  it('names the action alone when no count is shown', () => {
    expect(dockName('rail', 0)).toBe('Show captures');
    expect(dockName('side', 3)).toBe('Hide captures');
    expect(dockName('sheet', null)).toBe('Hide captures');
  });
});
