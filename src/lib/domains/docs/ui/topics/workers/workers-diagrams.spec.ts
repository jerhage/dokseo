import { describe, expect, it } from 'vitest';
import type { DiagramNode } from '$lib/ui/components/diagram';
import { CLONE_OR_TRANSFER, DOKSEO_WORKERS, MESSAGE_CHANNEL } from './workers-diagrams';

function inside(inner: DiagramNode, outer: DiagramNode): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

describe('the workers diagrams', () => {
  it.each([MESSAGE_CHANNEL, CLONE_OR_TRANSFER, DOKSEO_WORKERS])(
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

  it.each([MESSAGE_CHANNEL, CLONE_OR_TRANSFER])(
    'places every box inside exactly one group',
    (diagram) => {
      const groups = diagram.nodes.filter((node) => node.kind === 'group');
      const boxes = diagram.nodes.filter((node) => node.kind === 'box');
      const outside = MESSAGE_CHANNEL === diagram ? ['Request', 'Reply'] : [];

      for (const box of boxes) {
        const holders = groups.filter((held) => inside(box, held)).length;
        expect(holders).toBe(outside.includes(box.label) ? 0 : 1);
      }
    },
  );
});
