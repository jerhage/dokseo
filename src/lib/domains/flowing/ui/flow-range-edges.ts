type EdgeNode<N> = {
  readonly nodeType: number;
  readonly nodeName: string;
  readonly nodeValue: string | null;
  readonly childNodes: ArrayLike<N>;
  readonly firstChild: N | null;
  readonly lastChild: N | null;
  readonly nextSibling: N | null;
  readonly previousSibling: N | null;
  readonly parentNode: N | null;
};

type TextPoint<N> = {
  readonly node: N;
  readonly offset: number;
};

type BoundedRange<N> = {
  readonly startContainer: N;
  readonly startOffset: number;
  readonly endContainer: N;
  readonly endOffset: number;
};

type TextEdges<N> = {
  readonly start: TextPoint<N>;
  readonly end: TextPoint<N>;
};

const A_TEXT_NODE = 3;

const A_CDATA_SECTION = 4;

const AN_ELEMENT = 1;

const OUTSIDE_THE_READING = new Set(['rt', 'rp', 'script', 'style']);

function isText<N extends EdgeNode<N>>(node: N): boolean {
  return node.nodeType === A_TEXT_NODE || node.nodeType === A_CDATA_SECTION;
}

function readableText<N extends EdgeNode<N>>(node: N): boolean {
  return isText(node) && (node.nodeValue ?? '').length > 0;
}

function leftOutOfTheReading<N extends EdgeNode<N>>(node: N): boolean {
  return node.nodeType === AN_ELEMENT && OUTSIDE_THE_READING.has(node.nodeName.toLowerCase());
}

function after<N extends EdgeNode<N>>(node: N): N | null {
  for (let at: N | null = node; at !== null; at = at.parentNode) {
    if (at.nextSibling !== null) return at.nextSibling;
  }

  return null;
}

function next<N extends EdgeNode<N>>(node: N): N | null {
  if (!leftOutOfTheReading(node) && node.firstChild !== null) return node.firstChild;

  return after(node);
}

function deepestLast<N extends EdgeNode<N>>(node: N): N {
  let at = node;
  while (!leftOutOfTheReading(at) && at.lastChild !== null) at = at.lastChild;

  return at;
}

function previous<N extends EdgeNode<N>>(node: N): N | null {
  if (node.previousSibling !== null) return deepestLast(node.previousSibling);

  return node.parentNode;
}

function textStart<N extends EdgeNode<N>>(container: N, offset: number): TextPoint<N> | null {
  if (isText(container)) return { node: container, offset };

  for (let at = container.childNodes[offset] ?? after(container); at !== null; at = next(at)) {
    if (readableText(at)) return { node: at, offset: 0 };
  }

  return null;
}

function textEnd<N extends EdgeNode<N>>(container: N, offset: number): TextPoint<N> | null {
  if (isText(container)) return { node: container, offset };

  const before = container.childNodes[offset - 1];
  for (
    let at = before === undefined ? previous(container) : deepestLast(before);
    at !== null;
    at = previous(at)
  ) {
    if (readableText(at)) return { node: at, offset: (at.nodeValue ?? '').length };
  }

  return null;
}

function textEdges<N extends EdgeNode<N>>(range: BoundedRange<N>): TextEdges<N> | null {
  const start = textStart(range.startContainer, range.startOffset);
  const end = textEnd(range.endContainer, range.endOffset);
  if (start === null || end === null) return null;

  return { start, end };
}

export { textEdges, textEnd, textStart };
export type { BoundedRange, EdgeNode, TextEdges, TextPoint };
