import { describe, expect, it } from 'vitest';
import { FLOW_EDGES, FLOW_HEIGHT, FLOW_NODES, FLOW_WIDTH } from './flow-diagram';

describe('the contribution flow diagram', () => {
  it('keeps every node inside the drawing', () => {
    for (const node of FLOW_NODES) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(FLOW_WIDTH);
      expect(node.y + node.height).toBeLessThanOrEqual(FLOW_HEIGHT);
    }
  });

  it('links each step to the next one, in order', () => {
    expect(FLOW_EDGES.map((edge) => [edge.from, edge.to])).toEqual(
      FLOW_NODES.slice(1).map((node, index) => [FLOW_NODES[index], node]),
    );
  });
});
