import { describe, expect, it } from 'vitest';
import { AHEAD_SCREENS, BEHIND_SCREENS, MOST_SLICES } from '$lib/domains/viewing/domain/strip';
import { FILE_TO_PIXELS, PREFETCH_WINDOW } from './rendering-diagrams';

describe('the rendering diagrams', () => {
  it.each([FILE_TO_PIXELS, PREFETCH_WINDOW])('keeps every box inside the drawing', (diagram) => {
    for (const node of diagram.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
      expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
    }
    expect(diagram.width).toBeLessThanOrEqual(360);
  });

  it('draws the strip window with the constants the strip uses', () => {
    const details = PREFETCH_WINDOW.nodes.flatMap((node) =>
      node.kind === 'box' && node.detail !== undefined ? [node.detail] : [],
    );

    expect(details).toContain(`${BEHIND_SCREENS} screen behind`);
    expect(details).toContain(`${AHEAD_SCREENS} screens ahead, cap ${MOST_SLICES}`);
  });
});
