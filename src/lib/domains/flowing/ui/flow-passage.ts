import type { TextQuote } from '$lib/shared/anchor';
import { liftsAnything, passageQuote } from './flow-lift';
import type { LiftRect, LiftedPassage } from './flow-lift';
import { locateQuote, pointIn } from './flow-quote';

type ChapterCfis = {
  getCFI(index: number, range: Range): string;
};

const RUBY_READINGS = 'rt, rp';

const OUT_OF_THE_READING = new Set(['rt', 'rp', 'script', 'style']);

const AN_ELEMENT = 1;

const NOTHING_IS_SELECTED: readonly LiftRect[] = [];

function withoutReadings(fragment: DocumentFragment): string {
  for (const reading of fragment.querySelectorAll(RUBY_READINGS)) reading.remove();

  return fragment.textContent ?? '';
}

function textIn(range: Range): string {
  return withoutReadings(range.cloneContents());
}

function selectedRange(doc: Document): Range | null {
  const selection = doc.getSelection();
  if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  return range.collapsed ? null : range;
}

function quoteAround(doc: Document, range: Range): TextQuote {
  const before = doc.createRange();
  before.selectNodeContents(doc.body);
  before.setEnd(range.startContainer, range.startOffset);

  const after = doc.createRange();
  after.selectNodeContents(doc.body);
  after.setStart(range.endContainer, range.endOffset);

  return passageQuote(textIn(range), textIn(before), textIn(after));
}

function shownSelection(doc: Document): readonly LiftRect[] {
  const range = selectedRange(doc);
  if (range === null) return NOTHING_IS_SELECTED;
  if (!liftsAnything(textIn(range))) return NOTHING_IS_SELECTED;

  return [...range.getClientRects()];
}

function selectedPassage(doc: Document, index: number, cfis: ChapterCfis): LiftedPassage | null {
  const range = selectedRange(doc);
  if (range === null) return null;

  try {
    const quote = quoteAround(doc, range);
    if (!liftsAnything(quote.exact)) return null;

    return { cfi: cfis.getCFI(index, range), quote };
  } catch {
    return null;
  }
}

function readableParts(doc: Document, body: HTMLElement): readonly Node[] {
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (node.nodeType !== AN_ELEMENT) return NodeFilter.FILTER_ACCEPT;

      return OUT_OF_THE_READING.has(node.nodeName.toLowerCase())
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_SKIP;
    },
  });

  const parts: Node[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if ((node.nodeValue ?? '').length > 0) parts.push(node);
  }

  return parts;
}

function quoteRange(doc: Document, quote: TextQuote): Range | null {
  const body = doc.body;
  if (body === null) return null;

  const parts = readableParts(doc, body);
  const lengths = parts.map((part) => (part.nodeValue ?? '').length);
  const hit = locateQuote(parts.map((part) => part.nodeValue ?? '').join(''), quote);
  if (hit === null) return null;

  const from = pointIn(lengths, hit.start);
  const to = pointIn(lengths, hit.end);
  if (from === null || to === null) return null;

  const start = parts[from.part];
  const end = parts[to.part];
  if (start === undefined || end === undefined) return null;

  const range = doc.createRange();
  range.setStart(start, from.offset);
  range.setEnd(end, to.offset);

  return range;
}

function forgetSelection(doc: Document): void {
  doc.getSelection()?.removeAllRanges();
}

export { NOTHING_IS_SELECTED, forgetSelection, quoteRange, selectedPassage, shownSelection };
export type { ChapterCfis };
