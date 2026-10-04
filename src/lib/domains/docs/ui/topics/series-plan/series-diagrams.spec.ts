import { describe, expect, it } from 'vitest';
import { ROW_ACROSS_VERSIONS, SERIES_MODEL } from './series-diagrams';

describe('the series plan diagrams', () => {
  it.each([ROW_ACROSS_VERSIONS, SERIES_MODEL])('keeps every node inside the drawing', (diagram) => {
    for (const node of diagram.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
      expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
    }
    expect(diagram.width).toBeLessThanOrEqual(360);
  });

  it.each([ROW_ACROSS_VERSIONS, SERIES_MODEL])(
    'draws every edge between two of its own nodes',
    (diagram) => {
      for (const edge of diagram.edges) {
        expect(diagram.nodes).toContain(edge.from);
        expect(diagram.nodes).toContain(edge.to);
      }
    },
  );
});
