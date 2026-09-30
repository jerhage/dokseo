import { describe, expect, it } from 'vitest';
import {
  dockCover,
  dockDetentAfterKey,
  dockDetentHeight,
  dockDetentToggled,
  dockLabel,
  dockName,
  dockPlacement,
  dockSheetHeight,
  dockSheetMeasured,
  dockSheetSettle,
  dockTally,
  dockToggle,
} from './dock';
import type { DockSheetHeights, DockWords } from './dock';

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

const HEIGHTS: DockSheetHeights = { standard: 300, tall: 600 };

const SLOW_MS = 2000;

const QUICK_MS = 50;

describe('dockSheetHeight', () => {
  it('follows the finger, growing as it moves up and shrinking as it moves down', () => {
    expect(dockSheetHeight(300, -100, HEIGHTS)).toBe(400);
    expect(dockSheetHeight(300, 100, HEIGHTS)).toBe(200);
  });

  it('clamps the sheet between nothing and the tall height', () => {
    expect(dockSheetHeight(300, -900, HEIGHTS)).toBe(600);
    expect(dockSheetHeight(300, 900, HEIGHTS)).toBe(0);
  });

  it('keeps the start height when the travel is not a number', () => {
    expect(dockSheetHeight(300, Number.NaN, HEIGHTS)).toBe(300);
  });
});

describe('dockSheetMeasured', () => {
  it('accepts two positive heights, the standard no taller than the tall', () => {
    expect(dockSheetMeasured(HEIGHTS)).toBe(true);
  });

  it('rejects heights not measured yet or out of order', () => {
    expect(dockSheetMeasured({ standard: 0, tall: 0 })).toBe(false);
    expect(dockSheetMeasured({ standard: 600, tall: 300 })).toBe(false);
    expect(dockSheetMeasured({ standard: Number.NaN, tall: 600 })).toBe(false);
  });
});

describe('dockSheetSettle', () => {
  it('settles a slow drag at the nearest detent', () => {
    expect(dockSheetSettle(440, -140, SLOW_MS, HEIGHTS, 'standard')).toEqual({
      kind: 'detent',
      detent: 'standard',
    });
    expect(dockSheetSettle(460, -160, SLOW_MS, HEIGHTS, 'standard')).toEqual({
      kind: 'detent',
      detent: 'tall',
    });
    expect(dockSheetSettle(420, 180, SLOW_MS, HEIGHTS, 'tall')).toEqual({
      kind: 'detent',
      detent: 'standard',
    });
  });

  it('closes a slow drag that ends nearer nothing than the standard height', () => {
    expect(dockSheetSettle(140, 160, SLOW_MS, HEIGHTS, 'standard')).toEqual({ kind: 'close' });
    expect(dockSheetSettle(160, 140, SLOW_MS, HEIGHTS, 'standard')).toEqual({
      kind: 'detent',
      detent: 'standard',
    });
  });

  it('carries a quick flick up to the next detent above', () => {
    expect(dockSheetSettle(340, -40, QUICK_MS, HEIGHTS, 'standard')).toEqual({
      kind: 'detent',
      detent: 'tall',
    });
  });

  it('carries a quick flick down to the next detent below', () => {
    expect(dockSheetSettle(560, 40, QUICK_MS, HEIGHTS, 'tall')).toEqual({
      kind: 'detent',
      detent: 'standard',
    });
  });

  it('closes on a quick flick down from the standard height', () => {
    expect(dockSheetSettle(260, 40, QUICK_MS, HEIGHTS, 'standard')).toEqual({ kind: 'close' });
  });

  it('stays at the tall height on a quick flick up from it', () => {
    expect(dockSheetSettle(600, -40, QUICK_MS, HEIGHTS, 'tall')).toEqual({
      kind: 'detent',
      detent: 'tall',
    });
  });

  it('keeps the current detent while the heights are not measured', () => {
    expect(dockSheetSettle(0, 400, SLOW_MS, { standard: 0, tall: 0 }, 'tall')).toEqual({
      kind: 'detent',
      detent: 'tall',
    });
  });
});

describe('dockDetentAfterKey', () => {
  it('steps up and down between the detents and stops at either end', () => {
    expect(dockDetentAfterKey('standard', 'ArrowUp')).toBe('tall');
    expect(dockDetentAfterKey('tall', 'ArrowUp')).toBe('tall');
    expect(dockDetentAfterKey('tall', 'ArrowDown')).toBe('standard');
    expect(dockDetentAfterKey('standard', 'ArrowDown')).toBe('standard');
  });

  it('ignores every other key', () => {
    expect(dockDetentAfterKey('standard', 'Enter')).toBeNull();
    expect(dockDetentAfterKey('standard', 'ArrowLeft')).toBeNull();
  });
});

describe('dockDetentToggled', () => {
  it('switches between the standard and the tall height', () => {
    expect(dockDetentToggled('standard')).toBe('tall');
    expect(dockDetentToggled('tall')).toBe('standard');
  });
});

describe('dockDetentHeight', () => {
  it('reads each detent from its layout token', () => {
    expect(dockDetentHeight('standard')).toBe('var(--layout-sheet-height)');
    expect(dockDetentHeight('tall')).toBe('var(--layout-sheet-height-tall)');
  });
});

describe('dockCover', () => {
  it('reports how far the drawer rises above the room the dock keeps', () => {
    expect(dockCover(331, 33)).toBe(298);
    expect(dockCover(33, 33)).toBe(0);
  });

  it('reports nothing for a drawer shorter than its room or not measured', () => {
    expect(dockCover(20, 33)).toBe(0);
    expect(dockCover(Number.NaN, 33)).toBe(0);
  });
});
