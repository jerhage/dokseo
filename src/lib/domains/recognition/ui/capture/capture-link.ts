import type { Anchor } from '$lib/shared/anchor';
import type { BookId, CaptureId } from '$lib/shared/ids';
import { passageHref, readerHref } from '$lib/shared/reader-location';
import { firstImage, pageLabel } from './capture-place';
import { bookHref } from './search-rows';

type LinkedCapture = {
  readonly id: CaptureId;
  readonly anchor: Anchor;
};

type CaptureLink = {
  readonly href: string;
  readonly jump: string;
};

function captureLink(book: BookId, capture: LinkedCapture, query: string | null): CaptureLink {
  const arrival = { capture: capture.id, query };
  if (capture.anchor.kind === 'text') {
    return { href: passageHref(book, arrival), jump: 'Jump to the passage' };
  }

  const index = firstImage(capture.anchor);
  if (index === null) return { href: bookHref(book), jump: 'Open the book' };

  return { href: readerHref(book, index, arrival), jump: `Jump to p.${pageLabel(index)}` };
}

export { captureLink };
export type { CaptureLink, LinkedCapture };
