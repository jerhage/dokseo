import { describe, expect, it } from 'vitest';
import type { DiagramNode } from '$lib/components/diagram';
import { DATABASE_LAYOUT, TRANSACTION_LIFETIME } from './indexeddb-diagrams';

function inside(inner: DiagramNode, outer: DiagramNode): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function overlap(a: DiagramNode, b: DiagramNode): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('the IndexedDB diagrams', () => {
  it.each([DATABASE_LAYOUT, TRANSACTION_LIFETIME])(
    'keeps every node inside the drawing',
    (spec) => {
      for (const node of spec.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x + node.width).toBeLessThanOrEqual(spec.width);
        expect(node.y + node.height).toBeLessThanOrEqual(spec.height);
      }
      expect(spec.width).toBeLessThanOrEqual(360);
    },
  );

  it.each([DATABASE_LAYOUT, TRANSACTION_LIFETIME])(
    'places every box in exactly one group',
    (spec) => {
      const groups = spec.nodes.filter((node) => node.kind === 'group');
      const boxes = spec.nodes.filter((node) => node.kind === 'box');

      for (const box of boxes) {
        expect(groups.filter((held) => inside(box, held))).toHaveLength(1);
        expect(boxes.filter((other) => other !== box && overlap(box, other))).toEqual([]);
      }
    },
  );
});
