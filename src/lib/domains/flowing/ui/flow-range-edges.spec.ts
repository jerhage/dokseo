import { describe, expect, it } from 'vitest';
import { textEdges } from './flow-range-edges';

type FakeNode = {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  childNodes: FakeNode[];
  firstChild: FakeNode | null;
  lastChild: FakeNode | null;
  nextSibling: FakeNode | null;
  previousSibling: FakeNode | null;
  parentNode: FakeNode | null;
};

function node(nodeType: number, nodeName: string, nodeValue: string | null): FakeNode {
  return {
    nodeType,
    nodeName,
    nodeValue,
    childNodes: [],
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    parentNode: null,
  };
}

function text(value: string): FakeNode {
  return node(3, '#text', value);
}

function el(name: string, ...children: FakeNode[]): FakeNode {
  const parent = node(1, name.toUpperCase(), null);
  parent.childNodes = children;
  parent.firstChild = children[0] ?? null;
  parent.lastChild = children.at(-1) ?? null;
  for (const [at, child] of children.entries()) {
    child.parentNode = parent;
    child.previousSibling = children[at - 1] ?? null;
    child.nextSibling = children[at + 1] ?? null;
  }

  return parent;
}

function chapter() {
  const heading = text('제1장 『시작의 끝』');
  const dash = text('──이건 진짜로 꼴이 위험하게 됐어.');
  const following = text('한 푼도 없는 상황에');
  const gap = text('\n');
  const blank = el('p', el('br'));
  const dashParagraph = el('p', dash);
  const nextParagraph = el('p', following);
  const body = el(
    'body',
    text('\n'),
    el('h1', heading),
    text('\n'),
    blank,
    text('\n'),
    el('p', text('1')),
    text('\n'),
    dashParagraph,
    gap,
    nextParagraph,
  );

  return { body, heading, dash, following, gap, blank, dashParagraph, nextParagraph };
}

describe('textEdges', () => {
  it('moves the edges of a paragraph selected as an element, as Firefox selects it on a triple click, into its text', () => {
    const { dash, dashParagraph } = chapter();

    expect(
      textEdges({
        startContainer: dashParagraph,
        startOffset: 0,
        endContainer: dashParagraph,
        endOffset: 1,
      }),
    ).toEqual({
      start: { node: dash, offset: 0 },
      end: { node: dash, offset: dash.nodeValue?.length },
    });
  });

  it('keeps edges that already lie in text', () => {
    const { dash, following } = chapter();

    expect(
      textEdges({ startContainer: dash, startOffset: 2, endContainer: following, endOffset: 5 }),
    ).toEqual({ start: { node: dash, offset: 2 }, end: { node: following, offset: 5 } });
  });

  it('ends at the last text before an end placed at the start of the next paragraph', () => {
    const { dash, gap, nextParagraph } = chapter();

    expect(
      textEdges({
        startContainer: dash,
        startOffset: 0,
        endContainer: nextParagraph,
        endOffset: 0,
      }),
    ).toEqual({ start: { node: dash, offset: 0 }, end: { node: gap, offset: 1 } });
  });

  it('starts at the first text after a start placed before an element with no text', () => {
    const { body, blank, dash } = chapter();
    const at = body.childNodes.indexOf(blank);

    expect(
      textEdges({ startContainer: body, startOffset: at, endContainer: dash, endOffset: 4 })?.start,
    ).toEqual({ node: blank.nextSibling, offset: 0 });
  });

  it('leaves out ruby readings at either edge', () => {
    const base = text('鍵');
    const tail = text('が');
    const paragraph = el('p', el('ruby', base, el('rt', text('かぎ'))), tail);

    expect(
      textEdges({
        startContainer: paragraph,
        startOffset: 0,
        endContainer: paragraph,
        endOffset: 1,
      }),
    ).toEqual({ start: { node: base, offset: 0 }, end: { node: base, offset: 1 } });
  });

  it('reports no edges when the range holds no text at all', () => {
    const blank = el('p', el('br'));
    el('body', blank);

    expect(
      textEdges({ startContainer: blank, startOffset: 0, endContainer: blank, endOffset: 1 }),
    ).toBeNull();
  });
});
