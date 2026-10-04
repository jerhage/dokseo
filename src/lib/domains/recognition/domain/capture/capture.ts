import { match } from 'ts-pattern';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor, TextQuote } from '$lib/shared/anchor';
import { isCaptureOrigin } from '$lib/shared/capture-origin';
import type { CaptureOrigin } from '$lib/shared/capture-origin';
import {
  CorruptRow,
  isNumber,
  isNumberOrNull,
  isStoredFields,
  isStoredList,
  isText,
  isTextOrNull,
  isWholeNumber,
  knownStoredValue,
} from '$lib/shared/corrupt-row';
import { fitsOnPage, pageRect } from '$lib/shared/geometry';
import { captureId, imageIndex, parsedBookId, tagId } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';

type CaptureContent = {
  readonly id: CaptureId;
  readonly bookId: BookId;
  readonly anchor: Anchor;
  readonly text: string;
};

type CaptureHistory = {
  readonly createdAt: number;
  readonly editedAt: number | null;
  readonly tagIds: readonly TagId[];
};

type RecognizedDraft = CaptureContent & {
  readonly origin: 'recognized';
  readonly confidence: number | null;
};

type WrittenDraft = CaptureContent & {
  readonly origin: 'written';
};

type LiftedDraft = CaptureContent & {
  readonly origin: 'lifted';
};

type CaptureDraft = RecognizedDraft | WrittenDraft | LiftedDraft;

type RecognizedCapture = RecognizedDraft &
  CaptureHistory & {
    readonly note: string | null;
  };

type WrittenCapture = WrittenDraft & CaptureHistory;

type LiftedCapture = LiftedDraft &
  CaptureHistory & {
    readonly note: string | null;
  };

type Capture = RecognizedCapture | WrittenCapture | LiftedCapture;

type NotableCapture = RecognizedCapture | LiftedCapture;

type StoredCapture = { readonly [Field in keyof RecognizedCapture]?: unknown };

type UnreadableCapture = { readonly id: CaptureId; readonly stored: StoredCapture };

type StoredCaptures = {
  readonly captures: readonly Capture[];
  readonly unreadable: readonly UnreadableCapture[];
};

function takenCapture(draft: CaptureDraft, createdAt: number): Capture {
  const history: CaptureHistory = { createdAt, editedAt: null, tagIds: [] };

  return match(draft)
    .with({ origin: 'written' }, (note) => ({ ...note, ...history }))
    .with({ origin: 'recognized' }, (read) => ({ ...read, ...history, note: null }))
    .with({ origin: 'lifted' }, (lifted) => ({ ...lifted, ...history, note: null }))
    .exhaustive();
}

function captureField<T>(field: string, value: unknown, known: (value: unknown) => value is T): T {
  return knownStoredValue('capture', field, value, known);
}

function storedRegion(value: unknown): ImageRegion {
  const region = captureField('region', value, isStoredFields);
  const stored = captureField('region rect', region.rect, isStoredFields);
  const rect = pageRect(
    captureField('region x', stored.x, isNumber),
    captureField('region y', stored.y, isNumber),
    captureField('region width', stored.width, isNumber),
    captureField('region height', stored.height, isNumber),
  );
  if (!fitsOnPage(rect)) {
    const edges = [rect.x, rect.y, rect.width, rect.height].join(',');
    throw new CorruptRow('capture', 'region rect outside the page', edges);
  }

  return {
    index: imageIndex(captureField('region index', region.index, isWholeNumber)),
    rect,
  };
}

function isFilledText(value: unknown): value is string {
  return isText(value) && value.length > 0;
}

function isFilledTextOrNull(value: unknown): value is string | null {
  return value === null || isFilledText(value);
}

function isRegionList(value: unknown): value is readonly unknown[] {
  return isStoredList(value) && value.length > 0;
}

function storedQuote(value: unknown): TextQuote {
  const quote = captureField('quote', value, isStoredFields);
  return {
    exact: captureField('quoted text', quote.exact, isFilledText),
    prefix: captureField('quote prefix', quote.prefix, isText),
    suffix: captureField('quote suffix', quote.suffix, isText),
  };
}

function storedAnchor(value: unknown): Anchor {
  const anchor = captureField('anchor', value, isStoredFields);
  return match(anchor.kind)
    .with('region', () =>
      regionAnchor(captureField('regions', anchor.regions, isRegionList).map(storedRegion)),
    )
    .with('text', () =>
      textAnchor(
        captureField('anchor cfi', anchor.cfi, isFilledText),
        storedQuote(anchor.quote),
        captureField('chapter', anchor.chapter, isFilledTextOrNull),
      ),
    )
    .otherwise((kind) => {
      throw new CorruptRow('capture', 'anchor kind', kind);
    });
}

function isKey(value: unknown): value is string {
  return isText(value) && value.length > 0;
}

function isTagIdList(value: unknown): value is readonly string[] {
  return isStoredList(value) && value.every(isKey) && new Set(value).size === value.length;
}

function storedBookId(value: unknown): BookId {
  const id = isText(value) ? parsedBookId(value) : null;
  if (id === null) throw new CorruptRow('capture', 'book id', value);
  return id;
}

function storedEditedAt(value: unknown, createdAt: number): number | null {
  const editedAt = captureField('edited time', value, isNumberOrNull);
  if (editedAt !== null && editedAt < createdAt) {
    throw new CorruptRow('capture', 'edited time before its created time', editedAt);
  }
  return editedAt;
}

function refuseForeignField(
  stored: StoredCapture,
  field: 'note' | 'confidence',
  origin: string,
): void {
  if (Object.hasOwn(stored, field)) {
    throw new CorruptRow('capture', `${field} for a ${origin} capture`, stored[field]);
  }
}

function captureFromStored(stored: StoredCapture): Capture {
  const origin = captureField('origin', stored.origin, isCaptureOrigin);
  const createdAt = captureField('created time', stored.createdAt, isNumber);
  const held = {
    id: captureId(captureField('id', stored.id, isKey)),
    bookId: storedBookId(stored.bookId),
    anchor: storedAnchor(stored.anchor),
    text: captureField('text', stored.text, isText),
    createdAt,
    editedAt: storedEditedAt(stored.editedAt, createdAt),
    tagIds: captureField('tag ids', stored.tagIds, isTagIdList).map(tagId),
  };

  return match(origin)
    .with('written', () => {
      refuseForeignField(stored, 'note', origin);
      refuseForeignField(stored, 'confidence', origin);
      return { ...held, origin: 'written' as const };
    })
    .with('lifted', () => {
      refuseForeignField(stored, 'confidence', origin);
      return {
        ...held,
        origin: 'lifted' as const,
        note: captureField('note', stored.note, isTextOrNull),
      };
    })
    .with('recognized', () => ({
      ...held,
      origin: 'recognized' as const,
      note: captureField('note', stored.note, isTextOrNull),
      confidence: captureField('confidence', stored.confidence, isNumberOrNull),
    }))
    .exhaustive();
}

function unreadableCapture(row: StoredCapture, cause: unknown): UnreadableCapture {
  if (typeof row.id !== 'string' || row.id.length === 0) throw cause;
  return { id: captureId(row.id), stored: row };
}

function capturesFromStored(rows: readonly StoredCapture[]): StoredCaptures {
  const captures: Capture[] = [];
  const unreadable: UnreadableCapture[] = [];
  for (const row of rows) {
    try {
      captures.push(captureFromStored(row));
    } catch (cause) {
      unreadable.push(unreadableCapture(row, cause));
    }
  }
  return { captures, unreadable };
}

function movedCapture(row: StoredCapture, book: BookId): StoredCapture {
  try {
    return { ...captureFromStored(row), bookId: book };
  } catch (cause) {
    if (!(cause instanceof CorruptRow)) throw cause;
    return { ...row, bookId: book };
  }
}

function editedText(previous: string, text: string, origin: CaptureOrigin): string {
  const trimmed = text.trim();
  if (trimmed.length > 0) return trimmed;

  return match(origin)
    .with('written', () => trimmed)
    .with('recognized', () => previous)
    .with('lifted', () => previous)
    .exhaustive();
}

function editedCapture(capture: Capture, text: string, editedAt: number): Capture {
  return {
    ...capture,
    text: editedText(capture.text, text, capture.origin),
    editedAt: Math.max(editedAt, capture.createdAt),
  };
}

function notedCapture<T extends NotableCapture>(capture: T, note: string): T {
  const written = note.trim();
  return { ...capture, note: written.length === 0 ? null : written };
}

function oldestFirst(captures: readonly Capture[]): readonly Capture[] {
  return captures.toSorted((earlier, later) => earlier.createdAt - later.createdAt);
}

export {
  takenCapture,
  captureFromStored,
  capturesFromStored,
  movedCapture,
  editedText,
  editedCapture,
  notedCapture,
  oldestFirst,
};
export type {
  CaptureDraft,
  Capture,
  LiftedCapture,
  NotableCapture,
  RecognizedCapture,
  WrittenCapture,
  StoredCapture,
  StoredCaptures,
  UnreadableCapture,
};
