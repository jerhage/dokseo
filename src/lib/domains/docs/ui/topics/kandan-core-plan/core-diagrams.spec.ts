import { describe, expect, it } from 'vitest';
import { CONTRACT_FLOW, CORE_CHAIN } from './core-diagrams';

describe('the Kandan core plan diagrams', () => {
  it.each([CORE_CHAIN, CONTRACT_FLOW])('keeps every node inside the drawing', (diagram) => {
    for (const node of diagram.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
      expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
    }
    expect(diagram.width).toBeLessThanOrEqual(360);
  });

  it.each([CORE_CHAIN, CONTRACT_FLOW])(
    'draws every edge between two of its own nodes',
    (diagram) => {
      for (const edge of diagram.edges) {
        expect(diagram.nodes).toContain(edge.from);
        expect(diagram.nodes).toContain(edge.to);
      }
    },
  );
});
