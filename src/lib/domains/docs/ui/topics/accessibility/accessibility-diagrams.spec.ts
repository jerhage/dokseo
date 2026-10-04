import { describe, expect, it } from 'vitest';
import { DOM_TO_ASSISTIVE, KEY_DECISION } from './accessibility-diagrams';

describe('the accessibility diagrams', () => {
  it.each([DOM_TO_ASSISTIVE, KEY_DECISION])('keeps every node inside the drawing', (diagram) => {
    for (const node of diagram.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(diagram.width);
      expect(node.y + node.height).toBeLessThanOrEqual(diagram.height);
    }
    expect(diagram.width).toBeLessThanOrEqual(360);
  });

  it.each([DOM_TO_ASSISTIVE, KEY_DECISION])(
    'draws every edge between two of its own nodes',
    (diagram) => {
      for (const edge of diagram.edges) {
        expect(diagram.nodes).toContain(edge.from);
        expect(diagram.nodes).toContain(edge.to);
      }
    },
  );
});
