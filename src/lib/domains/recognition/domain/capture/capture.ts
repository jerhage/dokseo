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
  isTextList,
  isTextOrNull,
  knownStoredValue,
} from '$lib/shared/corrupt-row';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
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

type UnreadableCapture = { readonly id: CaptureId };

type StoredCaptures = {
  readonly captures: readonly Capture[];
  readonly unreadable: readonly UnreadableCapture[];
};

type RawRow = { readonly id?: unknown };

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
  const rect = captureField('region rect', region.rect, isStoredFields);
  return {
    index: imageIndex(captureField('region index', region.index, isNumber)),
    rect: imageRect(
      captureField('region x', rect.x, isNumber),
      captureField('region y', rect.y, isNumber),
      captureField('region width', rect.width, isNumber),
      captureField('region height', rect.height, isNumber),
    ),
  };
}

function storedQuote(value: unknown): TextQuote {
  const quote = captureField('quote', value, isStoredFields);
  return {
    exact: captureField('quoted text', quote.exact, isText),
    prefix: captureField('quote prefix', quote.prefix, isText),
    suffix: captureField('quote suffix', quote.suffix, isText),
  };
}

function storedAnchor(value: unknown): Anchor {
  const anchor = captureField('anchor', value, isStoredFields);
  return match(anchor.kind)
    .with('region', () =>
      regionAnchor(captureField('regions', anchor.regions, isStoredList).map(storedRegion)),
    )
    .with('text', () =>
      textAnchor(
        captureField('anchor cfi', anchor.cfi, isText),
        storedQuote(anchor.quote),
        captureField('chapter', anchor.chapter, isTextOrNull),
      ),
    )
    .otherwise((kind) => {
      throw new CorruptRow('capture', 'anchor kind', kind);
    });
}

function storedOrigin(stored: StoredCapture): CaptureOrigin {
  return isCaptureOrigin(stored.origin) ? stored.origin : 'recognized';
}

function storedNote(stored: StoredCapture): string | null {
  return stored.note === undefined ? null : captureField('note', stored.note, isTextOrNull);
}

function storedConfidence(stored: StoredCapture): number | null {
  if (stored.confidence === undefined) return null;
  return captureField('confidence', stored.confidence, isNumberOrNull);
}

function captureFromStored(stored: StoredCapture): Capture {
  const held = {
    id: captureId(captureField('id', stored.id, isText)),
    bookId: bookId(captureField('book id', stored.bookId, isText)),
    anchor: storedAnchor(stored.anchor),
    text: captureField('text', stored.text, isText),
    createdAt: captureField('created time', stored.createdAt, isNumber),
    editedAt: captureField('edited time', stored.editedAt, isNumberOrNull),
    tagIds: captureField('tag ids', stored.tagIds, isTextList).map(tagId),
  };

  return match(storedOrigin(stored))
    .with('written', () => ({ ...held, origin: 'written' as const }))
    .with('lifted', () => ({ ...held, origin: 'lifted' as const, note: storedNote(stored) }))
    .with('recognized', () => ({
      ...held,
      origin: 'recognized' as const,
      note: storedNote(stored),
      confidence: storedConfidence(stored),
    }))
    .exhaustive();
}

function unreadableCapture(row: RawRow, cause: unknown): UnreadableCapture {
  if (typeof row.id !== 'string' || row.id.length === 0) throw cause;
  return { id: captureId(row.id) };
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
  return { ...capture, text: editedText(capture.text, text, capture.origin), editedAt };
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
  editedText,
  editedCapture,
  notedCapture,
  oldestFirst,
  storedOrigin,
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
