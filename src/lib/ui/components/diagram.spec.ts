import { describe, expect, it } from 'vitest';
import { diagramTone, edgeLine, edgeRoute } from './diagram';

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
