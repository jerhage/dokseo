import { match } from 'ts-pattern';
import type { Anchor } from '$lib/shared/anchor';
import { isCaptureOrigin } from '$lib/shared/capture-origin';
import type { CaptureOrigin } from '$lib/shared/capture-origin';
import { CorruptRow } from '$lib/shared/corrupt-row';
import { captureId } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';

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

type StoredCapture = {
  readonly id: CaptureId;
  readonly bookId: BookId;
  readonly text: string;
  readonly anchor: Anchor;
  readonly note?: string | null;
  readonly confidence?: number | null;
  readonly createdAt: number;
  readonly editedAt: number | null;
  readonly origin: unknown;
  readonly tagIds: readonly TagId[];
};

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

function storedAnchor(anchor: Anchor): Anchor {
  const { kind } = anchor;
  if (kind === 'region' || kind === 'text') return anchor;
  throw new CorruptRow('capture', 'anchor kind', kind);
}

function storedOrigin(stored: StoredCapture): CaptureOrigin {
  return isCaptureOrigin(stored.origin) ? stored.origin : 'recognized';
}

function captureFromStored(stored: StoredCapture): Capture {
  const held = {
    id: stored.id,
    bookId: stored.bookId,
    anchor: storedAnchor(stored.anchor),
    text: stored.text,
    createdAt: stored.createdAt,
    editedAt: stored.editedAt,
    tagIds: stored.tagIds,
  };

  return match(storedOrigin(stored))
    .with('written', () => ({ ...held, origin: 'written' as const }))
    .with('lifted', () => ({ ...held, origin: 'lifted' as const, note: stored.note ?? null }))
    .with('recognized', () => ({
      ...held,
      origin: 'recognized' as const,
      note: stored.note ?? null,
      confidence: stored.confidence ?? null,
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
