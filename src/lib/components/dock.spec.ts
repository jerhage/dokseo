import { describe, expect, it } from 'vitest';
import {
  dockCover,
  dockDetentAfterKey,
  dockLabel,
  dockName,
  dockPlacement,
  dockSheetHeight,
  dockSheetMeasured,
  dockSheetSettle,
  dockTally,
  dockToggle,
} from './dock';
import type { DockPlacement, DockSheetHeights, DockWords } from './dock';

const WORDS: DockWords = {
  label: 'Captures',
  expandLabel: 'Show captures',
  collapseLabel: 'Hide captures',
};

const PLACEMENTS: readonly DockPlacement[] = ['side', 'sheet', 'rail', 'peek'];

describe('dockPlacement', () => {
  it('opens beside a wide page and peeks below a narrow one until asked, then follows the reader', () => {
    expect([
      dockPlacement(false, null),
      dockPlacement(true, null),
      dockPlacement(false, false),
      dockPlacement(true, true),
    ]).toEqual(['side', 'peek', 'rail', 'sheet']);
  });
});

describe('dockToggle', () => {
  it('offers to hide an open panel and to show a closed one, pointing each arrow the way the panel will move', () => {
    expect(
      PLACEMENTS.map((placement) => ({
        placement,
        open: dockToggle(placement).open,
        points: dockToggle(placement).points,
        label: dockLabel(placement, WORDS),
      })),
    ).toEqual([
      { placement: 'side', open: true, points: 'right', label: 'Hide captures' },
      { placement: 'sheet', open: true, points: 'down', label: 'Hide captures' },
      { placement: 'rail', open: false, points: 'left', label: 'Show captures' },
      { placement: 'peek', open: false, points: 'up', label: 'Show captures' },
    ]);
  });
});

describe('dockTally', () => {
  it('shows the count on a closed panel only, and none when there are no captures or none are known', () => {
    expect([
      dockTally('rail', 3),
      dockTally('peek', 3),
      dockTally('side', 3),
      dockTally('sheet', 3),
      dockTally('rail', 0),
      dockTally('peek', undefined),
    ]).toEqual([3, 3, null, null, null, null]);
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

  it('carries a quick flick to the next detent, closing below the standard height and stopping at the tall one', () => {
    expect([
      dockSheetSettle(340, -40, QUICK_MS, HEIGHTS, 'standard'),
      dockSheetSettle(560, 40, QUICK_MS, HEIGHTS, 'tall'),
      dockSheetSettle(260, 40, QUICK_MS, HEIGHTS, 'standard'),
      dockSheetSettle(600, -40, QUICK_MS, HEIGHTS, 'tall'),
    ]).toEqual([
      { kind: 'detent', detent: 'tall' },
      { kind: 'detent', detent: 'standard' },
      { kind: 'close' },
      { kind: 'detent', detent: 'tall' },
    ]);
  });

  it('keeps the current detent while the heights are not measured', () => {
    expect(dockSheetSettle(0, 400, SLOW_MS, { standard: 0, tall: 0 }, 'tall')).toEqual({
      kind: 'detent',
      detent: 'tall',
    });
  });
});

describe('dockDetentAfterKey', () => {
  it('steps up and down between the detents, stops at either end, and ignores every other key', () => {
    expect([
      dockDetentAfterKey('standard', 'ArrowUp'),
      dockDetentAfterKey('tall', 'ArrowUp'),
      dockDetentAfterKey('tall', 'ArrowDown'),
      dockDetentAfterKey('standard', 'ArrowDown'),
      dockDetentAfterKey('standard', 'Enter'),
      dockDetentAfterKey('standard', 'ArrowLeft'),
    ]).toEqual(['tall', 'tall', 'standard', 'standard', null, null]);
  });
});

describe('dockCover', () => {
  it('reports how far the drawer rises above the room the dock keeps, and nothing for one shorter or not measured', () => {
    expect([
      dockCover(331, 33),
      dockCover(33, 33),
      dockCover(20, 33),
      dockCover(Number.NaN, 33),
    ]).toEqual([298, 0, 0, 0]);
  });
});
