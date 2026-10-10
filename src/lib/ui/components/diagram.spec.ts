import { describe, expect, it } from 'vitest';
import {
  diagramLayers,
  diagramTone,
  edgeHeads,
  edgeLabelPlacement,
  edgeLine,
  edgePathData,
  edgeRoute,
  edgeShape,
  polylineMiddle,
} from './diagram';
import type { DiagramNode } from './diagram';

const top = { x: 0, y: 0, width: 100, height: 40 };

describe('edgeRoute', () => {
  it('routes down the middle of the columns two stacked boxes share', () => {
    expect(edgeRoute(top, { x: 50, y: 80, width: 100, height: 40 })).toEqual({
      kind: 'column',
      x: 75,
    });
  });

  it('routes along the middle of the rows two boxes side by side share', () => {
    expect(edgeRoute(top, { x: 160, y: 20, width: 80, height: 60 })).toEqual({
      kind: 'row',
      y: 30,
    });
  });

  it('frees a route between boxes that share no column and no row', () => {
    expect(edgeRoute(top, { x: 200, y: 200, width: 50, height: 50 })).toEqual({ kind: 'free' });
  });

  it('frees a route between a group and a box inside it', () => {
    expect(edgeRoute({ x: 0, y: 0, width: 300, height: 300 }, top)).toEqual({ kind: 'free' });
  });
});

describe('edgeLine', () => {
  it('runs from the bottom edge to the top edge of a box below, labelled beside it', () => {
    expect(edgeLine(top, { x: 0, y: 100, width: 100, height: 40 })).toEqual({
      start: { x: 50, y: 40 },
      end: { x: 50, y: 100 },
      middle: { x: 50, y: 70 },
      labelSide: 'beside',
    });
  });

  it('runs from the top edge to the bottom edge of a box above', () => {
    const line = edgeLine({ x: 0, y: 100, width: 100, height: 40 }, top);

    expect([line.start, line.end]).toEqual([
      { x: 50, y: 100 },
      { x: 50, y: 40 },
    ]);
  });

  it('runs from the end edge to the start edge of a box to the right, labelled above it', () => {
    expect(edgeLine(top, { x: 160, y: 0, width: 100, height: 40 })).toEqual({
      start: { x: 100, y: 20 },
      end: { x: 160, y: 20 },
      middle: { x: 130, y: 20 },
      labelSide: 'above',
    });
  });

  it('runs from the start edge of a box to the end edge of a box to its left', () => {
    const line = edgeLine({ x: 160, y: 0, width: 100, height: 40 }, top);

    expect([line.start, line.end]).toEqual([
      { x: 160, y: 20 },
      { x: 100, y: 20 },
    ]);
  });

  it('joins the centres of the facing edges along the longer axis on a free route', () => {
    expect(edgeLine(top, { x: 150, y: 300, width: 100, height: 40 })).toEqual({
      start: { x: 50, y: 40 },
      end: { x: 200, y: 300 },
      middle: { x: 125, y: 170 },
      labelSide: 'beside',
    });
  });
});

describe('diagramTone', () => {
  it('draws a node with no tone in the neutral tone', () => {
    expect(diagramTone({ kind: 'box', ...top, label: 'Page' })).toBe('neutral');
  });

  it('keeps the tone a node names', () => {
    expect(diagramTone({ kind: 'group', ...top, label: 'Origin', tone: 'accent' })).toBe('accent');
  });
});

describe('edgePathData', () => {
  it('moves to the first point and lines through the bends to the last', () => {
    expect(
      edgePathData([
        { x: 140, y: 44 },
        { x: 180, y: 44 },
        { x: 180, y: 164 },
        { x: 220, y: 164 },
      ]),
    ).toBe('M 140 44 L 180 44 L 180 164 L 220 164');
  });
});

describe('polylineMiddle', () => {
  it('finds the point halfway along the length of a bent route', () => {
    expect(
      polylineMiddle([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ]),
    ).toEqual({ x: 100, y: 0 });
  });
});

describe('edgeShape', () => {
  const from: DiagramNode = { kind: 'box', ...top, label: 'A' };
  const to: DiagramNode = { kind: 'box', x: 160, y: 0, width: 100, height: 40, label: 'B' };

  it('draws a straight line for an edge with no points', () => {
    expect(edgeShape({ from, to }).kind).toBe('line');
  });

  it('draws a straight line for an edge with a single point', () => {
    expect(edgeShape({ from, to, points: [{ x: 1, y: 1 }] }).kind).toBe('line');
  });

  it('draws a path for an edge with two points or more', () => {
    expect(
      edgeShape({
        from,
        to,
        points: [
          { x: 100, y: 20 },
          { x: 160, y: 20 },
        ],
      }),
    ).toMatchObject({ kind: 'path', d: 'M 100 20 L 160 20' });
  });
});

describe('edgeHeads', () => {
  it('draws a head at the end by default', () => {
    expect(edgeHeads(undefined)).toEqual({ start: false, end: true });
  });

  it('draws no head, or a head at both ends, when asked', () => {
    expect([edgeHeads('none'), edgeHeads('both')]).toEqual([
      { start: false, end: false },
      { start: true, end: true },
    ]);
  });
});

describe('edgeLabelPlacement', () => {
  const edge = {
    from: { kind: 'box', ...top, label: 'A' },
    to: { kind: 'box', ...top, label: 'B' },
  } as const;
  const middle = { x: 10, y: 20 };

  it('sets the label above a horizontal edge, at its middle', () => {
    expect(edgeLabelPlacement(edge, middle, 'above')).toEqual({
      x: 10,
      y: 20,
      dy: '-0.5em',
      anchor: 'middle',
    });
  });

  it('centres a label at the position the layout gives it', () => {
    expect(edgeLabelPlacement({ ...edge, labelAt: { x: 5, y: 6 } }, middle, 'above')).toEqual({
      x: 5,
      y: 6,
      dy: '0.35em',
      anchor: 'middle',
    });
  });

  it('sets a backed label on the line with no offset', () => {
    expect(edgeLabelPlacement({ ...edge, labelBacked: true }, middle, 'beside')).toEqual({
      x: 10,
      y: 20,
      dy: undefined,
      anchor: 'middle',
    });
  });
});

describe('diagramLayers', () => {
  const group: DiagramNode = { kind: 'group', ...top, label: 'G' };
  const box: DiagramNode = { kind: 'box', ...top, label: 'B' };

  it('draws the edges after the last group and before the boxes that follow it', () => {
    expect(diagramLayers([group, box, group, box]).map((layer) => layer.kind)).toEqual([
      'group',
      'box',
      'group',
      'edges',
      'box',
    ]);
  });

  it('draws the edges after every box when there is no group', () => {
    expect(diagramLayers([box, box]).map((layer) => layer.kind)).toEqual(['box', 'box', 'edges']);
  });
});
