import { describe, expect, it } from 'vitest';
import { EVENT_LOOP, STALE_RACE } from './async-diagrams';

describe('the async diagrams', () => {
  it.each([EVENT_LOOP, STALE_RACE])('keeps every box inside the drawing', (diagram) => {
    for (const node of diagram.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
      expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
    }
    expect(diagram.width).toBeLessThanOrEqual(360);
  });

  it('draws the stale answer below the fresh one, so time runs down the page', () => {
    const [, , fresh, stale] = STALE_RACE.nodes;

    expect(stale?.y).toBeGreaterThan(fresh?.y ?? Infinity);
  });
});
