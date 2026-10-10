import { match } from 'ts-pattern';
import type { Emphasis } from './emphasis';

type DiagramTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

type DiagramRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type DiagramBox = DiagramRect & {
  readonly kind: 'box';
  readonly label: string;
  readonly detail?: string;
  readonly tone?: DiagramTone;
  readonly emphasis?: Emphasis;
};

type DiagramGroup = DiagramRect & {
  readonly kind: 'group';
  readonly label: string;
  readonly tone?: DiagramTone;
};

type DiagramNode = DiagramBox | DiagramGroup;

type DiagramPoint = { readonly x: number; readonly y: number };

type DiagramSegment = { readonly start: DiagramPoint; readonly end: DiagramPoint };

type DiagramHeads = 'none' | 'end' | 'both';

type DiagramEdge = {
  readonly from: DiagramNode;
  readonly to: DiagramNode;
  readonly label?: string;
  readonly heads?: DiagramHeads;
  readonly points?: readonly DiagramPoint[];
  readonly labelAt?: DiagramPoint;
  readonly labelBacked?: boolean;
  readonly emphasis?: Emphasis;
};

type DiagramLayer =
  | { readonly kind: 'group'; readonly group: DiagramGroup }
  | { readonly kind: 'box'; readonly box: DiagramBox }
  | { readonly kind: 'edges' };

type EdgeHeads = { readonly start: boolean; readonly end: boolean };

type EdgeShape =
  | { readonly kind: 'line'; readonly line: EdgeLine }
  | {
      readonly kind: 'path';
      readonly d: string;
      readonly middle: DiagramPoint;
      readonly labelSide: EdgeLabelSide;
    };

type EdgeLabelStyle = 'backed' | 'placed' | EdgeLabelSide;

type EdgeLabelPlacement = {
  readonly x: number;
  readonly y: number;
  readonly dx?: string;
  readonly dy: string | undefined;
  readonly anchor: 'start' | 'middle';
};

type EdgeRoute =
  | { readonly kind: 'column'; readonly x: number }
  | { readonly kind: 'row'; readonly y: number }
  | { readonly kind: 'free' };

type EdgeLabelSide = 'beside' | 'above';

type EdgeLine = {
  readonly start: DiagramPoint;
  readonly end: DiagramPoint;
  readonly middle: DiagramPoint;
  readonly labelSide: EdgeLabelSide;
};

function diagramTone(node: DiagramNode): DiagramTone {
  return node.tone ?? 'neutral';
}

function centre(rect: DiagramRect): DiagramPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function overlapMiddle(startA: number, endA: number, startB: number, endB: number): number | null {
  const start = Math.max(startA, startB);
  const end = Math.min(endA, endB);
  return start < end ? (start + end) / 2 : null;
}

function edgeRoute(from: DiagramRect, to: DiagramRect): EdgeRoute {
  const sharedX = overlapMiddle(from.x, from.x + from.width, to.x, to.x + to.width);
  const sharedY = overlapMiddle(from.y, from.y + from.height, to.y, to.y + to.height);
  if (sharedX !== null && sharedY === null) return { kind: 'column', x: sharedX };
  if (sharedY !== null && sharedX === null) return { kind: 'row', y: sharedY };
  return { kind: 'free' };
}

function verticalEdge(from: DiagramRect, to: DiagramRect, startX: number, endX: number): EdgeLine {
  const down = to.y > from.y;
  const start = { x: startX, y: down ? from.y + from.height : from.y };
  const end = { x: endX, y: down ? to.y : to.y + to.height };
  return { start, end, middle: midpoint(start, end), labelSide: 'beside' };
}

function horizontalEdge(
  from: DiagramRect,
  to: DiagramRect,
  startY: number,
  endY: number,
): EdgeLine {
  const right = to.x > from.x;
  const start = { x: right ? from.x + from.width : from.x, y: startY };
  const end = { x: right ? to.x : to.x + to.width, y: endY };
  return { start, end, middle: midpoint(start, end), labelSide: 'above' };
}

function midpoint(start: DiagramPoint, end: DiagramPoint): DiagramPoint {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

function edgeLine(from: DiagramRect, to: DiagramRect): EdgeLine {
  const a = centre(from);
  const b = centre(to);
  return match(edgeRoute(from, to))
    .with({ kind: 'column' }, ({ x }) => verticalEdge(from, to, x, x))
    .with({ kind: 'row' }, ({ y }) => horizontalEdge(from, to, y, y))
    .with({ kind: 'free' }, () =>
      Math.abs(b.y - a.y) >= Math.abs(b.x - a.x)
        ? verticalEdge(from, to, a.x, b.x)
        : horizontalEdge(from, to, a.y, b.y),
    )
    .exhaustive();
}

function diagramLayers(nodes: readonly DiagramNode[]): readonly DiagramLayer[] {
  const lastGroup = nodes.findLastIndex((node) => node.kind === 'group');
  const edgesAt = lastGroup === -1 ? nodes.length : lastGroup + 1;
  const layers = nodes.map((node): DiagramLayer => {
    return node.kind === 'group' ? { kind: 'group', group: node } : { kind: 'box', box: node };
  });
  return [...layers.slice(0, edgesAt), { kind: 'edges' }, ...layers.slice(edgesAt)];
}

function edgeHeads(heads: DiagramHeads | undefined): EdgeHeads {
  return match<DiagramHeads, EdgeHeads>(heads ?? 'end')
    .with('none', () => ({ start: false, end: false }))
    .with('end', () => ({ start: false, end: true }))
    .with('both', () => ({ start: true, end: true }))
    .exhaustive();
}

function edgePathData(points: readonly DiagramPoint[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function distance(start: DiagramPoint, end: DiagramPoint): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function segments(points: readonly DiagramPoint[]): readonly DiagramSegment[] {
  return points.flatMap((end, index) => {
    const start = points[index - 1];
    return start === undefined ? [] : [{ start, end }];
  });
}

function polylineMiddle(points: readonly DiagramPoint[]): DiagramPoint {
  const pairs = segments(points);
  const half = pairs.reduce((total, pair) => total + distance(pair.start, pair.end), 0) / 2;
  let walked = 0;
  for (const { start, end } of pairs) {
    const length = distance(start, end);
    if (length > 0 && walked + length >= half) {
      const share = (half - walked) / length;
      return { x: start.x + (end.x - start.x) * share, y: start.y + (end.y - start.y) * share };
    }
    walked += length;
  }
  return pairs.at(0)?.start ?? { x: 0, y: 0 };
}

function edgeShape(edge: DiagramEdge): EdgeShape {
  const points = edge.points;
  if (points === undefined || points.length < 2) {
    return { kind: 'line', line: edgeLine(edge.from, edge.to) };
  }
  return {
    kind: 'path',
    d: edgePathData(points),
    middle: polylineMiddle(points),
    labelSide: 'above',
  };
}

function edgeLabelStyle(edge: DiagramEdge, side: EdgeLabelSide): EdgeLabelStyle {
  if (edge.labelBacked === true) return 'backed';
  if (edge.labelAt !== undefined) return 'placed';
  return side;
}

function edgeLabelPlacement(
  edge: DiagramEdge,
  middle: DiagramPoint,
  side: EdgeLabelSide,
): EdgeLabelPlacement {
  const { x, y } = edge.labelAt ?? middle;
  return match<EdgeLabelStyle, EdgeLabelPlacement>(edgeLabelStyle(edge, side))
    .with('backed', () => ({ x, y, dy: undefined, anchor: 'middle' }))
    .with('placed', () => ({ x, y, dy: '0.35em', anchor: 'middle' }))
    .with('beside', () => ({ x, y, dx: '0.5em', dy: '0.35em', anchor: 'start' }))
    .with('above', () => ({ x, y, dy: '-0.5em', anchor: 'middle' }))
    .exhaustive();
}

export {
  diagramLayers,
  diagramTone,
  edgeHeads,
  edgeLabelPlacement,
  edgeLine,
  edgePathData,
  edgeRoute,
  edgeShape,
  polylineMiddle,
};
export type {
  DiagramBox,
  DiagramEdge,
  DiagramGroup,
  DiagramHeads,
  DiagramLayer,
  DiagramNode,
  DiagramPoint,
  DiagramRect,
  DiagramTone,
  EdgeHeads,
  EdgeLabelPlacement,
  EdgeLabelSide,
  EdgeLabelStyle,
  EdgeLine,
  EdgeRoute,
  EdgeShape,
};
