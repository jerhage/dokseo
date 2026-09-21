import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';

type CaptureOrigin = 'recognized' | 'written';

type CaptureDraft = {
  readonly id: CaptureId;
  readonly bookId: BookId;
  readonly regions: readonly ImageRegion[];
  readonly text: string;
  readonly confidence: number | null;
  readonly origin: CaptureOrigin;
};

type Capture = CaptureDraft & {
  readonly createdAt: number;
  readonly editedAt: number | null;
};

type StoredCapture = Omit<Capture, 'confidence' | 'createdAt' | 'editedAt' | 'origin'> & {
  readonly confidence?: number | null;
  readonly createdAt?: number | null;
  readonly editedAt?: number | null;
  readonly origin?: CaptureOrigin;
};

function takenCapture(draft: CaptureDraft, createdAt: number): Capture {
  return { ...draft, createdAt, editedAt: null };
}

function captureFromStored(stored: StoredCapture): Capture {
  return {
    ...stored,
    confidence: stored.confidence ?? null,
    createdAt: stored.createdAt ?? 0,
    editedAt: stored.editedAt ?? null,
    origin: stored.origin ?? 'recognized',
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

function oldestFirst(captures: readonly Capture[]): readonly Capture[] {
  return captures.toSorted((earlier, later) => earlier.createdAt - later.createdAt);
}

export { takenCapture, captureFromStored, editedText, editedCapture, oldestFirst };
export type { CaptureDraft, Capture, CaptureOrigin, StoredCapture };
