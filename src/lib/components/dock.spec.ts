import { describe, expect, it } from 'vitest';
import { dockLabel, dockName, dockPlacement, dockTally, dockToggle } from './dock';
import type { DockWords } from './dock';

const WORDS: DockWords = {
  label: 'Captures',
  expandLabel: 'Show captures',
  collapseLabel: 'Hide captures',
};

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
    expect(dockToggle('side')).toMatchObject({ open: true });
    expect(dockLabel('side', WORDS)).toBe('Hide captures');
    expect(dockToggle('sheet')).toMatchObject({ open: true });
    expect(dockLabel('sheet', WORDS)).toBe('Hide captures');
    expect(dockToggle('rail')).toMatchObject({ open: false });
    expect(dockLabel('rail', WORDS)).toBe('Show captures');
    expect(dockToggle('peek')).toMatchObject({ open: false });
    expect(dockLabel('peek', WORDS)).toBe('Show captures');
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
    expect(dockTally('peek', undefined)).toBeNull();
  });
});

describe('dockName', () => {
  it('names the action and the count of a closed rail', () => {
    expect(dockName('rail', 3, WORDS)).toBe('Show captures, 3');
  });

  it('starts the peek name with its visible label and count, then names the action', () => {
    expect(dockName('peek', 12, WORDS)).toBe('Captures, 12, Show captures');
    expect(dockName('peek', 0, WORDS)).toBe('Captures, Show captures');
  });

  it('names the action alone when no count is shown', () => {
    expect(dockName('rail', 0, WORDS)).toBe('Show captures');
    expect(dockName('side', 3, WORDS)).toBe('Hide captures');
    expect(dockName('sheet', undefined, WORDS)).toBe('Hide captures');
  });
});
