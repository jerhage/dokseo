import { describe, expect, it } from 'vitest';
import { QUOTE_FLOW } from './drift-diagrams';

describe('the example drift diagrams', () => {
  it('keeps every node inside the drawing', () => {
    for (const node of QUOTE_FLOW.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(QUOTE_FLOW.width);
      expect(node.y + node.height).toBeLessThanOrEqual(QUOTE_FLOW.height);
    }
    expect(QUOTE_FLOW.width).toBeLessThanOrEqual(360);
  });

  it('draws every edge between two of its own nodes', () => {
    for (const edge of QUOTE_FLOW.edges) {
      expect(QUOTE_FLOW.nodes).toContain(edge.from);
      expect(QUOTE_FLOW.nodes).toContain(edge.to);
    }
  });
});
