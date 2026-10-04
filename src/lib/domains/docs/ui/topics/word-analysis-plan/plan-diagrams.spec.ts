import { describe, expect, it } from 'vitest';
import { WHERE_IT_RUNS, WORD_PIPELINE } from './plan-diagrams';

describe('the word analysis plan diagrams', () => {
  it.each([WORD_PIPELINE, WHERE_IT_RUNS])('keeps every node inside the drawing', (diagram) => {
    for (const node of diagram.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
      expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
    }
    expect(diagram.width).toBeLessThanOrEqual(360);
  });

  it.each([WORD_PIPELINE, WHERE_IT_RUNS])(
    'draws every edge between two of its own nodes',
    (diagram) => {
      for (const edge of diagram.edges) {
        expect(diagram.nodes).toContain(edge.from);
        expect(diagram.nodes).toContain(edge.to);
      }
    },
  );
});
