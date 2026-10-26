import { describe, expect, it } from 'vitest';
import { edgeShape } from '$lib/ui/components/diagram';
import type {
  DiagramEdge,
  DiagramNode,
  DiagramPoint,
  DiagramRect,
} from '$lib/ui/components/diagram';
import {
  CATALOG_SOURCE,
  DOMAIN_CYCLE,
  DOMAIN_GRAPH,
  LAYERS,
  PORT_AND_ADAPTERS,
  REQUEST_PATH,
} from './architecture-diagrams';
import type { DiagramSpec } from './architecture-diagrams';

const GAP = 4;

function edgePoints(edge: DiagramEdge): readonly DiagramPoint[] {
  const shape = edgeShape(edge);
  if (shape.kind === 'line') return [shape.line.start, shape.line.end];
  return edge.points ?? [];
}

function segmentHitsRect(start: DiagramPoint, end: DiagramPoint, rect: DiagramRect): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const bounds = [
    [-dx, start.x - rect.x],
    [dx, rect.x + rect.width - start.x],
    [-dy, start.y - rect.y],
    [dy, rect.y + rect.height - start.y],
  ] as const;
  let entry = 0;
  let exit = 1;
  for (const [direction, distance] of bounds) {
    if (direction === 0) {
      if (distance < 0) return false;
    } else if (direction < 0) {
      entry = Math.max(entry, distance / direction);
    } else {
      exit = Math.min(exit, distance / direction);
    }
  }
  return entry <= exit;
}

function inflated(rect: DiagramRect): DiagramRect {
  return {
    x: rect.x - GAP,
    y: rect.y - GAP,
    width: rect.width + GAP * 2,
    height: rect.height + GAP * 2,
  };
}

function crossings(spec: DiagramSpec): readonly string[] {
  return spec.edges.flatMap((edge) => {
    const points = edgePoints(edge);
    const obstacles = spec.nodes.filter(
      (node: DiagramNode) => node.kind === 'box' && node !== edge.from && node !== edge.to,
    );
    return obstacles.flatMap((node) =>
      points.slice(1).some((end, index) => {
        const start = points[index];
        return start !== undefined && segmentHitsRect(start, end, inflated(node));
      })
        ? [`${nodeLabel(edge.from)} to ${nodeLabel(edge.to)} crosses ${nodeLabel(node)}`]
        : [],
    );
  });
}

function nodeLabel(node: DiagramNode): string {
  return node.label;
}

const SPECS: readonly (readonly [string, DiagramSpec])[] = [
  ['LAYERS', LAYERS],
  ['PORT_AND_ADAPTERS', PORT_AND_ADAPTERS],
  ['CATALOG_SOURCE', CATALOG_SOURCE],
  ['DOMAIN_CYCLE', DOMAIN_CYCLE],
  ['DOMAIN_GRAPH', DOMAIN_GRAPH],
  ['REQUEST_PATH', REQUEST_PATH],
];

describe('the architecture diagrams', () => {
  it.each(SPECS)('draws no edge of %s through a box it does not connect', (_name, spec) => {
    expect(spec.edges.length).toBeGreaterThan(0);
    expect(crossings(spec)).toEqual([]);
  });

  it('reports an edge that runs through a third box', () => {
    const left: DiagramNode = { kind: 'box', x: 0, y: 0, width: 40, height: 20, label: 'left' };
    const middle: DiagramNode = {
      kind: 'box',
      x: 100,
      y: 0,
      width: 40,
      height: 20,
      label: 'middle',
    };
    const right: DiagramNode = { kind: 'box', x: 200, y: 0, width: 40, height: 20, label: 'right' };
    const spec: DiagramSpec = {
      label: 'x',
      width: 240,
      height: 20,
      nodes: [left, middle, right],
      edges: [{ from: left, to: right }],
    };

    expect(crossings(spec)).toEqual(['left to right crosses middle']);
  });
});
