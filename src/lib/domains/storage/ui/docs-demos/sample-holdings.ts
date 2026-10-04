import type { Book } from '$lib/domains/library/domain/book/book';
import type { RemovedBook } from '$lib/domains/library/domain/book/removed-book';
import { editedCapture } from '$lib/domains/recognition/domain/capture/capture';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, contentHash, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';

type Holdings = {
  readonly books: readonly Book[];
  readonly removedBooks: readonly RemovedBook[];
  readonly tags: readonly Tag[];
  readonly captures: readonly Capture[];
};

type SampleBook = {
  readonly id: string;
  readonly title: string;
  readonly hash: string;
  readonly fileName: string;
  readonly imageCount: number;
};

type SampleCapture = {
  readonly id: string;
  readonly book: BookId;
  readonly page: number;
  readonly text: string;
  readonly minute: number;
  readonly tags?: readonly TagId[];
  readonly note?: string;
};

const SAMPLE_START = Date.UTC(2026, 9, 1, 9, 0);

const MINUTE = 60_000;

const HARBOR_HASH = '5f2a9c41e07b3d86a1c4f0e9b2d7a361';

const LANTERN_HASH = 'c81e728d9d4c2f636f067f89cc14862c';

function sampleTime(minute: number): number {
  return SAMPLE_START + minute * MINUTE;
}

function sampleBook(sample: SampleBook): Book {
  return {
    id: bookId(sample.id),
    title: sample.title,
    alias: null,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'auto',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash(sample.hash),
    fileName: sample.fileName,
    imageCount: sample.imageCount,
    addedAt: SAMPLE_START,
    position: imagePlace(imageIndex(0)),
    lastReadAt: null,
    finishedAt: null,
  };
}

function removedRecord(book: Book): RemovedBook {
  return {
    id: book.id,
    title: book.title,
    alias: book.alias,
    contentHash: book.contentHash,
    fileName: book.fileName,
    language: book.language,
    direction: book.direction,
    addedAt: book.addedAt,
  };
}

function sampleTag(id: string, name: string, minute: number): Tag {
  return { id: tagId(id), name, colour: 'sage', createdAt: sampleTime(minute) };
}

function sampleCapture(sample: SampleCapture): Capture {
  return {
    id: captureId(sample.id),
    bookId: sample.book,
    anchor: regionAnchor([{ index: imageIndex(sample.page), rect: imageRect(412, 96, 88, 240) }]),
    text: sample.text,
    origin: 'recognized',
    confidence: 0.94,
    note: sample.note ?? null,
    createdAt: sampleTime(sample.minute),
    editedAt: null,
    tagIds: sample.tags ?? [],
  };
}

const HARBOR = sampleBook({
  id: '9a1c6f04-2b7e-4d55-8c3a-71e0f2b6d913',
  title: 'Harbor Lights, Volume 1',
  hash: HARBOR_HASH,
  fileName: 'harbor-lights-01.cbz',
  imageCount: 214,
});

const LANTERNS = sampleBook({
  id: '4e7d2b90-c13f-4a86-9b05-58d6a2e1f7c4',
  title: 'Paper Lanterns',
  hash: LANTERN_HASH,
  fileName: 'paper-lanterns.cbz',
  imageCount: 180,
});

const GONE_BOOK = bookId('0d3b8e51-7a24-4c9f-b6e2-1f5a9c7d4083');

const VOCAB = sampleTag('a3f1c0d2-6e4b-4b7a-9d18-2c5e7f9a0b31', 'vocab', 1);

const GRAMMAR = sampleTag('7c2e9b41-d0a5-4f63-8e17-b4c9a2d6f058', 'grammar', 2);

const HARBOR_FIRST = sampleCapture({
  id: '1b9e4c70-3d2a-4f18-a6c5-e07d9b2f4a86',
  book: HARBOR.id,
  page: 4,
  text: '港の灯り',
  minute: 10,
  tags: [VOCAB.id],
});

const HARBOR_SECOND = sampleCapture({
  id: '6d0f3a29-8b51-4c7e-92d4-a1e6c5b8f037',
  book: HARBOR.id,
  page: 12,
  text: 'また明日',
  minute: 12,
  note: 'see you tomorrow',
});

const LANTERN_FIRST = sampleCapture({
  id: 'e4a7b1c3-5f90-4d2e-8b6a-3c9d0f1e7a52',
  book: LANTERNS.id,
  page: 7,
  text: '紙の提灯',
  minute: 20,
  tags: [VOCAB.id, GRAMMAR.id],
});

const ORPHAN = sampleCapture({
  id: 'f8c2d6e0-1a3b-4e5f-9c7d-2b4a6e8f0d19',
  book: GONE_BOOK,
  page: 3,
  text: '消えた本',
  minute: 25,
});

const SAMPLE_HOLDINGS: Holdings = {
  books: [HARBOR, LANTERNS],
  removedBooks: [],
  tags: [VOCAB, GRAMMAR],
  captures: [HARBOR_FIRST, HARBOR_SECOND, LANTERN_FIRST],
};

function isRemoved(holdings: Holdings, id: BookId): boolean {
  return holdings.removedBooks.some((book) => book.id === id);
}

function withBookRemoved(holdings: Holdings, id: BookId, removed: boolean): Holdings {
  if (removed === isRemoved(holdings, id)) return holdings;
  if (removed) {
    const book = holdings.books.find((held) => held.id === id);
    if (book === undefined) return holdings;
    return {
      ...holdings,
      books: holdings.books.filter((held) => held.id !== id),
      removedBooks: [...holdings.removedBooks, removedRecord(book)],
    };
  }
  const original = [HARBOR, LANTERNS].find((book) => book.id === id);
  if (original === undefined) return holdings;
  return {
    ...holdings,
    books: [...holdings.books, original],
    removedBooks: holdings.removedBooks.filter((held) => held.id !== id),
  };
}

function hasOrphan(holdings: Holdings): boolean {
  return holdings.captures.some((capture) => capture.id === ORPHAN.id);
}

function withOrphan(holdings: Holdings, included: boolean): Holdings {
  if (included === hasOrphan(holdings)) return holdings;
  const others = holdings.captures.filter((capture) => capture.id !== ORPHAN.id);
  return { ...holdings, captures: included ? [...others, ORPHAN] : others };
}

function withCapture(
  holdings: Holdings,
  id: CaptureId,
  change: (capture: Capture) => Capture,
): Holdings {
  return {
    ...holdings,
    captures: holdings.captures.map((capture) => (capture.id === id ? change(capture) : capture)),
  };
}

function withText(holdings: Holdings, id: CaptureId, text: string, at: number): Holdings {
  return withCapture(holdings, id, (capture) =>
    capture.text === text.trim() ? capture : editedCapture(capture, text, at),
  );
}

function withTagToggled(holdings: Holdings, id: CaptureId, tag: TagId): Holdings {
  return withCapture(holdings, id, (capture) => ({
    ...capture,
    tagIds: capture.tagIds.includes(tag)
      ? capture.tagIds.filter((held) => held !== tag)
      : [...capture.tagIds, tag],
  }));
}

function bookTitle(holdings: Holdings, id: BookId): string | null {
  const book =
    holdings.books.find((held) => held.id === id) ??
    holdings.removedBooks.find((held) => held.id === id);
  return book === undefined ? null : book.title;
}

export {
  GONE_BOOK,
  GRAMMAR,
  HARBOR,
  HARBOR_FIRST,
  HARBOR_SECOND,
  LANTERNS,
  LANTERN_FIRST,
  MINUTE,
  ORPHAN,
  SAMPLE_HOLDINGS,
  SAMPLE_START,
  VOCAB,
  bookTitle,
  hasOrphan,
  isRemoved,
  removedRecord,
  sampleBook,
  sampleCapture,
  sampleTag,
  sampleTime,
  withBookRemoved,
  withOrphan,
  withTagToggled,
  withText,
};
export type { Holdings };
