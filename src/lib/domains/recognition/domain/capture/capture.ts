import { match } from 'ts-pattern';
import { regionAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import type { CaptureOrigin } from '$lib/shared/capture-origin';
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

type StoredCapture = {
  readonly id: CaptureId;
  readonly bookId: BookId;
  readonly text: string;
  readonly anchor?: Anchor;
  readonly regions?: readonly ImageRegion[];
  readonly note?: string | null;
  readonly confidence?: number | null;
  readonly createdAt?: number | null;
  readonly editedAt?: number | null;
  readonly origin?: CaptureOrigin;
  readonly tagIds?: readonly TagId[];
};

function takenCapture(draft: CaptureDraft, createdAt: number): Capture {
  const history: CaptureHistory = { createdAt, editedAt: null, tagIds: [] };

  return match(draft)
    .with({ origin: 'written' }, (note) => ({ ...note, ...history }))
    .with({ origin: 'recognized' }, (read) => ({ ...read, ...history, note: null }))
    .with({ origin: 'lifted' }, (lifted) => ({ ...lifted, ...history, note: null }))
    .exhaustive();
}

function storedAnchor(stored: StoredCapture): Anchor {
  return stored.anchor ?? regionAnchor(stored.regions ?? []);
}

function storedOrigin(stored: StoredCapture): CaptureOrigin {
  return stored.origin ?? 'recognized';
}

function captureFromStored(stored: StoredCapture): Capture {
  const held = {
    id: stored.id,
    bookId: stored.bookId,
    anchor: storedAnchor(stored),
    text: stored.text,
    createdAt: stored.createdAt ?? 0,
    editedAt: stored.editedAt ?? null,
    tagIds: stored.tagIds ?? [],
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
};
