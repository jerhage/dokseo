import { fromRange, joinIndir } from 'foliate-js/epubcfi.js';
import { collapsedCfi } from '$lib/domains/flowing/ui/flow-cfi';
import { textEdges } from '$lib/domains/flowing/ui/flow-range-edges';
import type { BoundedRange } from '$lib/domains/flowing/ui/flow-range-edges';

type SourceNode = {
  readonly nodeType: number;
  readonly nodeName: string;
  readonly nodeValue: string | null;
  readonly childNodes: ArrayLike<SourceNode>;
};

type ChapterRoot = { readonly documentElement: ChapterNode };

type ChapterRange = BoundedRange<ChapterNode> & { readonly collapsed: boolean };

type SampleChapter = {
  readonly body: ChapterNode;
  readonly copies: ReadonlyMap<SourceNode, ChapterNode>;
};

type PointReading =
  | {
      readonly kind: 'text';
      readonly offset: number;
      readonly length: number;
      readonly paragraph: number | null;
    }
  | {
      readonly kind: 'element';
      readonly name: string;
      readonly offset: number;
      readonly children: number;
      readonly paragraph: number | null;
    };

type RangeReading = {
  readonly start: PointReading;
  readonly end: PointReading;
  readonly cfi: string;
  readonly collapsed: boolean;
};

type SelectionReading =
  | { readonly kind: 'nothing' }
  | { readonly kind: 'outside' }
  | {
      readonly kind: 'read';
      readonly selection: RangeReading;
      readonly onText: RangeReading | null;
    };

const SPINE_STEP = '/6/12';

const AN_ELEMENT = 1;

const A_TEXT_NODE = 3;

const A_CDATA_SECTION = 4;

class ChapterNode {
  readonly nodeType: number;
  readonly nodeName: string;
  readonly nodeValue: string | null;
  readonly childNodes: ChapterNode[] = [];
  parentNode: ChapterNode | null = null;

  constructor(nodeType: number, nodeName: string, nodeValue: string | null) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.nodeValue = nodeValue;
  }

  get firstChild(): ChapterNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): ChapterNode | null {
    return this.childNodes.at(-1) ?? null;
  }

  get nextSibling(): ChapterNode | null {
    return this.sibling(1);
  }

  get previousSibling(): ChapterNode | null {
    return this.sibling(-1);
  }

  get ownerDocument(): ChapterRoot {
    if (this.parentNode === null) return { documentElement: this };

    return this.parentNode.ownerDocument;
  }

  append(child: ChapterNode): ChapterNode {
    child.parentNode = this;
    this.childNodes.push(child);

    return child;
  }

  private sibling(step: number): ChapterNode | null {
    const siblings = this.parentNode?.childNodes ?? [];

    return siblings[siblings.indexOf(this) + step] ?? null;
  }
}

function copyInto(parent: ChapterNode, source: SourceNode, copies: Map<SourceNode, ChapterNode>) {
  const copy = parent.append(new ChapterNode(source.nodeType, source.nodeName, source.nodeValue));
  copies.set(source, copy);
  for (const child of Array.from(source.childNodes)) copyInto(copy, child, copies);
}

function sampleChapter(sample: SourceNode): SampleChapter {
  const html = new ChapterNode(AN_ELEMENT, 'HTML', null);
  html.append(new ChapterNode(AN_ELEMENT, 'HEAD', null));
  const body = html.append(new ChapterNode(AN_ELEMENT, 'BODY', null));

  const copies = new Map<SourceNode, ChapterNode>([[sample, body]]);
  for (const child of Array.from(sample.childNodes)) copyInto(body, child, copies);

  return { body, copies };
}

function paragraphOf(body: ChapterNode, node: ChapterNode): number | null {
  let at: ChapterNode = node;
  while (at.parentNode !== null && at.parentNode !== body) at = at.parentNode;
  if (at.parentNode !== body) return null;

  const blocks = body.childNodes.filter((child) => child.nodeType === AN_ELEMENT);
  const index = blocks.indexOf(at);

  return index === -1 ? null : index + 1;
}

function pointReading(body: ChapterNode, node: ChapterNode, offset: number): PointReading {
  const paragraph = paragraphOf(body, node);
  if (node.nodeType === A_TEXT_NODE || node.nodeType === A_CDATA_SECTION) {
    return { kind: 'text', offset, length: (node.nodeValue ?? '').length, paragraph };
  }

  return {
    kind: 'element',
    name: node.nodeName.toLowerCase(),
    offset,
    children: node.childNodes.length,
    paragraph,
  };
}

function chapterRange(
  startContainer: ChapterNode,
  startOffset: number,
  endContainer: ChapterNode,
  endOffset: number,
): ChapterRange {
  const collapsed = startContainer === endContainer && startOffset === endOffset;

  return { startContainer, startOffset, endContainer, endOffset, collapsed };
}

function rangeReading(body: ChapterNode, range: ChapterRange): RangeReading {
  const cfi = joinIndir(SPINE_STEP, fromRange(range));

  return {
    start: pointReading(body, range.startContainer, range.startOffset),
    end: pointReading(body, range.endContainer, range.endOffset),
    cfi,
    collapsed: collapsedCfi(cfi),
  };
}

function readSelection(
  chapter: SampleChapter,
  range: (BoundedRange<SourceNode> & { readonly collapsed: boolean }) | null,
): SelectionReading {
  if (range === null || range.collapsed) return { kind: 'nothing' };

  const start = chapter.copies.get(range.startContainer);
  const end = chapter.copies.get(range.endContainer);
  if (start === undefined || end === undefined) return { kind: 'outside' };

  const selected = chapterRange(start, range.startOffset, end, range.endOffset);
  const edges = textEdges(selected);
  const onText =
    edges === null
      ? null
      : rangeReading(
          chapter.body,
          chapterRange(edges.start.node, edges.start.offset, edges.end.node, edges.end.offset),
        );

  return { kind: 'read', selection: rangeReading(chapter.body, selected), onText };
}

function counted(count: number, unit: string): string {
  return count === 1 ? `1 ${unit}` : `${count} ${unit}s`;
}

function pointText(point: PointReading): string {
  if (point.kind === 'text') {
    const place =
      point.paragraph === null
        ? 'text node between paragraphs'
        : `text node of paragraph ${point.paragraph}`;

    return `${place}, offset ${point.offset} of ${counted(point.length, 'character')}`;
  }

  const element =
    point.paragraph === null ? `<${point.name}>` : `<${point.name}> paragraph ${point.paragraph}`;

  return `${element}, offset ${point.offset} of ${counted(point.children, 'child node')}`;
}

export { SPINE_STEP, pointText, readSelection, sampleChapter };
export type { PointReading, RangeReading, SampleChapter, SelectionReading, SourceNode };
