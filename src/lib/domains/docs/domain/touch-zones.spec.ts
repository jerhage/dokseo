import { describe, expect, it } from 'vitest';
import { zoneBands, zoneOutcome } from './touch-zones';
import type { ZoneScene } from './touch-zones';

const touchZones: ZoneScene = {
  pointer: 'touch',
  turns: 'tap-zones',
  edgeClicks: true,
  direction: 'ltr',
  chromeShown: false,
};

describe('zoneOutcome', () => {
  it('turns back on the left 30 percent of a left-to-right page and forward on the right', () => {
    expect(zoneOutcome(0.2, touchZones)).toBe('previous');
    expect(zoneOutcome(0.5, touchZones)).toBe('menu');
    expect(zoneOutcome(0.8, touchZones)).toBe('next');
  });

  it('mirrors the sides for a right-to-left book', () => {
    const rtl: ZoneScene = { ...touchZones, direction: 'rtl' };

    expect(zoneOutcome(0.2, rtl)).toBe('next');
    expect(zoneOutcome(0.8, rtl)).toBe('previous');
  });

  it('gives every touch the bars in swipe only', () => {
    expect(zoneOutcome(0.05, { ...touchZones, turns: 'swipe-only' })).toBe('menu');
  });

  it('hides the bars on a touch only while they show', () => {
    expect(zoneOutcome(0.05, { ...touchZones, chromeShown: true })).toBe('hide-menu');
  });

  it('turns on a mouse click in the outer tenth only, and never with edge clicks off', () => {
    const mouse: ZoneScene = { ...touchZones, pointer: 'mouse' };

    expect(zoneOutcome(0.05, mouse)).toBe('previous');
    expect(zoneOutcome(0.2, mouse)).toBe('menu');
    expect(zoneOutcome(0.95, { ...mouse, edgeClicks: false })).toBe('menu');
  });

  it('keeps a mouse click turning while the bars show', () => {
    expect(zoneOutcome(0.95, { ...touchZones, pointer: 'mouse', chromeShown: true })).toBe('next');
  });
});

describe('zoneBands', () => {
  it('reports three touch bands at 30, 40 and 30 percent', () => {
    expect(zoneBands(touchZones)).toEqual([
      { from: 0, to: 0.3, outcome: 'previous' },
      { from: 0.3, to: 0.7, outcome: 'menu' },
      { from: 0.7, to: 1, outcome: 'next' },
    ]);
  });

  it('merges the page into one band when every point gives the same outcome', () => {
    expect(zoneBands({ ...touchZones, turns: 'swipe-only' })).toEqual([
      { from: 0, to: 1, outcome: 'menu' },
    ]);
  });

  it('reports the mouse edges at a tenth of the page', () => {
    const bands = zoneBands({ ...touchZones, pointer: 'mouse', direction: 'rtl' });

    expect(bands.map((band) => band.outcome)).toEqual(['next', 'menu', 'previous']);
    expect(bands[0]?.to).toBe(0.1);
  });
});
