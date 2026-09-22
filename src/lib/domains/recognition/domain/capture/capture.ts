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

type CaptureDraft = RecognizedDraft | WrittenDraft;

type RecognizedCapture = RecognizedDraft &
  CaptureHistory & {
    readonly note: string | null;
  };

type WrittenCapture = WrittenDraft & CaptureHistory;

type Capture = RecognizedCapture | WrittenCapture;

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
  if (draft.origin === 'written') return { ...draft, ...history };

  return { ...draft, ...history, note: null };
}

function storedAnchor(stored: StoredCapture): Anchor {
  return stored.anchor ?? regionAnchor(stored.regions ?? []);
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

  if (stored.origin === 'written') return { ...held, origin: 'written' };

  return {
    ...held,
    origin: 'recognized',
    note: stored.note ?? null,
    confidence: stored.confidence ?? null,
  };
}

function editedText(previous: string, text: string, origin: CaptureOrigin): string {
  const trimmed = text.trim();
  if (trimmed.length > 0) return trimmed;

  return origin === 'written' ? trimmed : previous;
}

function editedCapture(capture: Capture, text: string, editedAt: number): Capture {
  return { ...capture, text: editedText(capture.text, text, capture.origin), editedAt };
}

function notedCapture(capture: RecognizedCapture, note: string): RecognizedCapture {
  const written = note.trim();
  return { ...capture, note: written.length === 0 ? null : written };
}

function oldestFirst(captures: readonly Capture[]): readonly Capture[] {
  return captures.toSorted((earlier, later) => earlier.createdAt - later.createdAt);
}

export { takenCapture, captureFromStored, editedText, editedCapture, notedCapture, oldestFirst };
export type { CaptureDraft, Capture, RecognizedCapture, WrittenCapture, StoredCapture };
