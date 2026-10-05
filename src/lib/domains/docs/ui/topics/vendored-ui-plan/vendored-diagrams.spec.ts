import { describe, expect, it } from 'vitest';
import { SQUASH_PULL_HISTORY, VENDORING_FLOW } from './vendored-diagrams';

describe('the vendored UI library plan diagrams', () => {
  it.each([VENDORING_FLOW, SQUASH_PULL_HISTORY])(
    'keeps every node inside the drawing',
    (diagram) => {
      for (const node of diagram.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
        expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
      }
      expect(diagram.width).toBeLessThanOrEqual(360);
    },
  );

  it.each([VENDORING_FLOW, SQUASH_PULL_HISTORY])(
    'draws every edge between two of its own nodes',
    (diagram) => {
      for (const edge of diagram.edges) {
        expect(diagram.nodes).toContain(edge.from);
        expect(diagram.nodes).toContain(edge.to);
      }
    },
  );
});
