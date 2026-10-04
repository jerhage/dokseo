import { describe, expect, it } from 'vitest';
import { TESTING_SECTIONS } from './testing-sections';
import { TEST_KINDS, VERIFY_LADDER } from './testing-diagrams';

describe('the testing diagrams', () => {
  it.each([TEST_KINDS, VERIFY_LADDER])('keeps every node inside the drawing', (diagram) => {
    for (const node of diagram.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
      expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
    }
    expect(diagram.width).toBeLessThanOrEqual(360);
  });

  it('draws the ladder edges only between its own nodes', () => {
    for (const edge of VERIFY_LADDER.edges) {
      expect(VERIFY_LADDER.nodes).toContain(edge.from);
      expect(VERIFY_LADDER.nodes).toContain(edge.to);
    }
  });
});

describe('the testing sections', () => {
  it('titles every section differently', () => {
    const titles = Object.values(TESTING_SECTIONS);

    expect(new Set(titles).size).toBe(titles.length);
  });
});
