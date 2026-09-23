import type { TextQuote } from '$lib/shared/anchor';
import { liftsAnything, passageQuote } from './flow-lift';
import type { LiftRect, LiftedPassage } from './flow-lift';

type ChapterCfis = {
  getCFI(index: number, range: Range): string;
};

const RUBY_READINGS = 'rt, rp';

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

function forgetSelection(doc: Document): void {
  doc.getSelection()?.removeAllRanges();
}

export { NOTHING_IS_SELECTED, forgetSelection, selectedPassage, shownSelection };
export type { ChapterCfis };
