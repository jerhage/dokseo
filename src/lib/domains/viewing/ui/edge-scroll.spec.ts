import { describe, expect, it } from 'vitest';
import {
  EDGE_TOP_SPEED_PX_PER_S,
  EDGE_ZONE_PX,
  LONGEST_EDGE_FRAME_MS,
  edgeScrollBy,
  edgeSpeed,
  edgeZone,
} from './edge-scroll';

const band = { top: 100, bottom: 900 };

describe('edgeZone', () => {
  it('reports clear in the middle of the scroller', () => {
    expect(edgeZone(500, band)).toEqual({ kind: 'clear' });
  });

  it('reports how deep the pointer sits in the top zone', () => {
    expect(edgeZone(band.top + EDGE_ZONE_PX / 4, band)).toEqual({ kind: 'near-top', depth: 0.75 });
  });

  it('reports how deep the pointer sits in the bottom zone', () => {
    expect(edgeZone(band.bottom - EDGE_ZONE_PX / 2, band)).toEqual({
      kind: 'near-bottom',
      depth: 0.5,
    });
  });

  it('caps the depth for a pointer past the edge', () => {
    expect([edgeZone(band.top - 300, band), edgeZone(band.bottom + 300, band)]).toEqual([
      { kind: 'near-top', depth: 1 },
      { kind: 'near-bottom', depth: 1 },
    ]);
  });

  it('shrinks the zones to half of a scroller too short for them', () => {
    const short = { top: 0, bottom: EDGE_ZONE_PX };

    expect([edgeZone(EDGE_ZONE_PX / 4, short), edgeZone((EDGE_ZONE_PX * 3) / 4, short)]).toEqual([
      { kind: 'near-top', depth: 0.5 },
      { kind: 'near-bottom', depth: 0.5 },
    ]);
  });

  it('reports clear for a scroller with no height or a pointer with no position', () => {
    expect([edgeZone(10, { top: 50, bottom: 50 }), edgeZone(Number.NaN, band)]).toEqual([
      { kind: 'clear' },
      { kind: 'clear' },
    ]);
  });
});

describe('edgeSpeed', () => {
  it('stands still in the middle of the scroller', () => {
    expect(edgeSpeed(500, band)).toBe(0);
  });

  it('scrolls up faster the nearer the pointer is to the top edge', () => {
    const outer = edgeSpeed(band.top + EDGE_ZONE_PX * 0.75, band);
    const inner = edgeSpeed(band.top + EDGE_ZONE_PX * 0.25, band);

    expect(outer).toBeLessThan(0);
    expect(inner).toBeLessThan(outer);
  });

  it('scrolls down faster the nearer the pointer is to the bottom edge', () => {
    const outer = edgeSpeed(band.bottom - EDGE_ZONE_PX * 0.75, band);
    const inner = edgeSpeed(band.bottom - EDGE_ZONE_PX * 0.25, band);

    expect(outer).toBeGreaterThan(0);
    expect(inner).toBeGreaterThan(outer);
  });

  it('reaches the top speed at the edge and holds it beyond', () => {
    expect([edgeSpeed(band.bottom, band), edgeSpeed(band.bottom + 500, band)]).toEqual([
      EDGE_TOP_SPEED_PX_PER_S,
      EDGE_TOP_SPEED_PX_PER_S,
    ]);
  });
});

describe('edgeScrollBy', () => {
  it('scrolls the distance the speed covers in the elapsed time', () => {
    expect(edgeScrollBy(1200, 16)).toBeCloseTo(19.2);
    expect(edgeScrollBy(-1200, 16)).toBeCloseTo(-19.2);
  });

  it('caps a long stall at the longest frame so the strip never leaps', () => {
    expect(edgeScrollBy(2000, 5000)).toBe((2000 * LONGEST_EDGE_FRAME_MS) / 1000);
  });

  it('scrolls nothing for no elapsed time or a speed that is not finite', () => {
    expect([edgeScrollBy(1000, 0), edgeScrollBy(1000, -5), edgeScrollBy(Number.NaN, 16)]).toEqual([
      0, 0, 0,
    ]);
  });
});
