import { describe, expect, it } from 'vitest';
import { pointText, readSelection, sampleChapter } from './selection-reading';
import type { SelectionReading, SourceNode } from './selection-reading';

type FakeNode = SourceNode & { readonly childNodes: FakeNode[] };

function text(value: string): FakeNode {
  return { nodeType: 3, nodeName: '#text', nodeValue: value, childNodes: [] };
}

function el(name: string, ...children: FakeNode[]): FakeNode {
  return { nodeType: 1, nodeName: name.toUpperCase(), nodeValue: null, childNodes: children };
}

function chapterOfParagraphs(count: number, between: string | null) {
  const texts = Array.from({ length: count }, (_, at) => text(`Paragraph number ${at + 1}.`));
  const paragraphs = texts.map((line) => el('p', line));
  const children = paragraphs.flatMap((paragraph, at) =>
    between === null || at === 0 ? [paragraph] : [text(between), paragraph],
  );

  return { sample: el('div', ...children), paragraphs, texts };
}

function range(start: FakeNode, startOffset: number, end: FakeNode, endOffset: number) {
  const collapsed = start === end && startOffset === endOffset;

  return { startContainer: start, startOffset, endContainer: end, endOffset, collapsed };
}

function read(reading: SelectionReading) {
  if (reading.kind !== 'read') throw new Error(`Expected a reading, got ${reading.kind}`);

  return reading;
}

const EIGHTH = 7;

describe('readSelection', () => {
  it('writes the recorded collapsed cfi for the eighth paragraph selected on the element', () => {
    const { sample, paragraphs } = chapterOfParagraphs(9, null);
    const paragraph = paragraphs[EIGHTH]!;

    const reading = read(readSelection(sampleChapter(sample), range(paragraph, 0, paragraph, 1)));

    expect(reading.selection.cfi).toBe('epubcfi(/6/12!/4,/16,/16)');
    expect(reading.selection.collapsed).toBe(true);
  });

  it('moves the element edges into the text before it writes the cfi', () => {
    const { sample, paragraphs } = chapterOfParagraphs(9, null);
    const paragraph = paragraphs[EIGHTH]!;

    const reading = read(readSelection(sampleChapter(sample), range(paragraph, 0, paragraph, 1)));

    expect(reading.onText?.cfi).toBe('epubcfi(/6/12!/4/16,/1:0,/1:19)');
    expect(reading.onText?.collapsed).toBe(false);
  });

  it('writes a range that ends on the next paragraph for a text start', () => {
    const { sample, paragraphs, texts } = chapterOfParagraphs(9, null);

    const reading = read(
      readSelection(sampleChapter(sample), range(texts[EIGHTH]!, 0, paragraphs[EIGHTH + 1]!, 0)),
    );

    expect(reading.selection.cfi).toBe('epubcfi(/6/12!/4,/16/1:0,/18)');
    expect(reading.selection.collapsed).toBe(false);
    expect(reading.onText?.cfi).toBe('epubcfi(/6/12!/4/16,/1:0,/1:19)');
  });

  it('ends the moved range in the whitespace between paragraphs when there is some', () => {
    const { sample, paragraphs, texts } = chapterOfParagraphs(3, '\n');

    const reading = read(
      readSelection(sampleChapter(sample), range(texts[1]!, 0, paragraphs[2]!, 0)),
    );

    expect(reading.onText?.end).toEqual({ kind: 'text', offset: 1, length: 1, paragraph: null });
  });

  it('keeps a range already in text as it is', () => {
    const { sample, texts } = chapterOfParagraphs(2, null);

    const reading = read(readSelection(sampleChapter(sample), range(texts[1]!, 0, texts[1]!, 9)));

    expect(reading.selection.cfi).toBe('epubcfi(/6/12!/4/4,/1:0,/1:9)');
    expect(reading.onText?.cfi).toBe(reading.selection.cfi);
  });

  it('reports nothing for no range or a caret', () => {
    const { sample, texts } = chapterOfParagraphs(1, null);
    const chapter = sampleChapter(sample);

    expect(readSelection(chapter, null)).toEqual({ kind: 'nothing' });
    expect(readSelection(chapter, range(texts[0]!, 2, texts[0]!, 2))).toEqual({ kind: 'nothing' });
  });

  it('reports an edge outside the sample', () => {
    const { sample, texts } = chapterOfParagraphs(1, null);

    const reading = readSelection(sampleChapter(sample), range(texts[0]!, 0, text('elsewhere'), 2));

    expect(reading).toEqual({ kind: 'outside' });
  });

  it('reads the element edges with their paragraph and child count', () => {
    const { sample, paragraphs } = chapterOfParagraphs(2, null);
    const paragraph = paragraphs[1]!;

    const reading = read(readSelection(sampleChapter(sample), range(paragraph, 0, paragraph, 1)));

    expect(reading.selection.start).toEqual({
      kind: 'element',
      name: 'p',
      offset: 0,
      children: 1,
      paragraph: 2,
    });
  });
});

describe('pointText', () => {
  it('names a text point by its paragraph and character offset', () => {
    expect(pointText({ kind: 'text', offset: 0, length: 20, paragraph: 2 })).toBe(
      'text node of paragraph 2, offset 0 of 20 characters',
    );
  });

  it('names a text point outside any paragraph as between paragraphs', () => {
    expect(pointText({ kind: 'text', offset: 1, length: 1, paragraph: null })).toBe(
      'text node between paragraphs, offset 1 of 1 character',
    );
  });

  it('names an element point by its child node offset', () => {
    expect(pointText({ kind: 'element', name: 'p', offset: 1, children: 1, paragraph: 2 })).toBe(
      '<p> paragraph 2, offset 1 of 1 child node',
    );
  });

  it('names the sample body without a paragraph', () => {
    expect(
      pointText({ kind: 'element', name: 'body', offset: 3, children: 5, paragraph: null }),
    ).toBe('<body>, offset 3 of 5 child nodes');
  });
});
