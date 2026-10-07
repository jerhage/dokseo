import { describe, expect, it } from 'vitest';
import { CHROME_EDGES, FIREFOX_EDGES } from './edge-diagram';
import { readSelection, sampleChapter } from './selection-reading';
import type { SourceNode } from './selection-reading';

type FakeNode = SourceNode & { readonly childNodes: FakeNode[] };

const texts: FakeNode[] = Array.from({ length: 9 }, (_, at) => ({
  nodeType: 3,
  nodeName: '#text',
  nodeValue: `Paragraph ${at + 1}.`,
  childNodes: [],
}));

const paragraphs: FakeNode[] = texts.map((line) => ({
  nodeType: 1,
  nodeName: 'P',
  nodeValue: null,
  childNodes: [line],
}));

const chapter = sampleChapter({
  nodeType: 1,
  nodeName: 'DIV',
  nodeValue: null,
  childNodes: paragraphs,
});

function cfiOf(start: FakeNode, startOffset: number, end: FakeNode, endOffset: number): string {
  const reading = readSelection(chapter, {
    startContainer: start,
    startOffset,
    endContainer: end,
    endOffset,
    collapsed: false,
  });

  return reading.kind === 'read' ? reading.selection.cfi : reading.kind;
}

describe('the edge diagrams', () => {
  it('shows the cfi foliate-js writes for the Firefox edges', () => {
    const paragraph = paragraphs[7]!;

    expect(cfiOf(paragraph, 0, paragraph, 1)).toBe(FIREFOX_EDGES.cfi);
  });

  it('shows the cfi foliate-js writes for the Chrome edges', () => {
    expect(cfiOf(texts[7]!, 0, paragraphs[8]!, 0)).toBe(CHROME_EDGES.cfi);
  });
});
