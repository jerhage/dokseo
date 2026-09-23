import type { TextQuote } from '$lib/shared/anchor';
import { liftsAnything, passageQuote } from './flow-lift';
import type { LiftRect, LiftedPassage } from './flow-lift';

type ChapterCfis = {
  getCFI(index: number, range: Range): string;
};

type SelectedPassage = {
  readonly passage: LiftedPassage;
  readonly rects: readonly LiftRect[];
};

const RUBY_READINGS = 'rt, rp';

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

function selectedPassage(doc: Document, index: number, cfis: ChapterCfis): SelectedPassage | null {
  const range = selectedRange(doc);
  if (range === null) return null;

  try {
    const quote = quoteAround(doc, range);
    if (!liftsAnything(quote.exact)) return null;

    return {
      passage: { cfi: cfis.getCFI(index, range), quote },
      rects: [...range.getClientRects()],
    };
  } catch {
    return null;
  }
}

function forgetSelection(doc: Document): void {
  doc.getSelection()?.removeAllRanges();
}

export { forgetSelection, selectedPassage };
export type { ChapterCfis, SelectedPassage };
