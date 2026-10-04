import { describe, expect, it } from 'vitest';
import { BOOK_LIFE, MATCHING_LADDER } from './identity-diagrams';

describe('the book identity diagrams', () => {
  it.each([MATCHING_LADDER, BOOK_LIFE])('keeps every node inside the drawing', (diagram) => {
    for (const node of diagram.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
      expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
    }
    expect(diagram.width).toBeLessThanOrEqual(360);
  });

  it.each([MATCHING_LADDER, BOOK_LIFE])('draws edges only between its own nodes', (diagram) => {
    for (const edge of diagram.edges) {
      expect(diagram.nodes).toContain(edge.from);
      expect(diagram.nodes).toContain(edge.to);
    }
  });
});
