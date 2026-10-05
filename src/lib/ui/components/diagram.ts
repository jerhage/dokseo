import { match } from 'ts-pattern';

type DiagramTone = 'neutral' | 'primary' | 'accent';

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
};

type DiagramGroup = DiagramRect & {
  readonly kind: 'group';
  readonly label: string;
  readonly tone?: DiagramTone;
};

type DiagramNode = DiagramBox | DiagramGroup;

type DiagramEdge = {
  readonly from: DiagramNode;
  readonly to: DiagramNode;
  readonly label?: string;
};

type DiagramPoint = { readonly x: number; readonly y: number };

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

export { diagramTone, edgeLine, edgeRoute };
export type {
  DiagramBox,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  DiagramPoint,
  DiagramRect,
  DiagramTone,
  EdgeLabelSide,
  EdgeLine,
  EdgeRoute,
};
