import type { Anchor } from '$lib/shared/anchor';
import type { BookId } from '$lib/shared/ids';
import { passageHref, readerHref } from '$lib/shared/reader-location';
import { firstImage, pageLabel } from './capture-place';

type LinkedCapture = {
  readonly anchor: Anchor;
};

type CaptureLink = {
  readonly href: string;
  readonly jump: string;
};

function bookHref(id: BookId): string {
  return `/read/${encodeURIComponent(id)}`;
}

function captureLink(book: BookId, capture: LinkedCapture, query: string | null): CaptureLink {
  if (capture.anchor.kind === 'text') {
    return { href: passageHref(book, capture.anchor.cfi, query), jump: 'Jump to the passage' };
  }

  const index = firstImage(capture.anchor);
  if (index === null) return { href: bookHref(book), jump: 'Open the book' };

  return { href: readerHref(book, index, query), jump: `Jump to p.${pageLabel(index)}` };
}

export { bookHref, captureLink };
export type { CaptureLink, LinkedCapture };
