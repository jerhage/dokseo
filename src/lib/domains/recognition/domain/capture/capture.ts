import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';

export type CaptureDraft = {
  readonly id: CaptureId;
  readonly bookId: BookId;
  readonly regions: readonly ImageRegion[];
  readonly text: string;
  readonly confidence: number | null;
};

export type Capture = CaptureDraft & {
  readonly createdAt: number;
  readonly editedAt: number | null;
};

export type StoredCapture = Omit<Capture, 'confidence' | 'createdAt' | 'editedAt'> & {
  readonly confidence?: number | null;
  readonly createdAt?: number | null;
  readonly editedAt?: number | null;
};

export function takenCapture(draft: CaptureDraft, createdAt: number): Capture {
  return { ...draft, createdAt, editedAt: null };
}

export function captureFromStored(stored: StoredCapture): Capture {
  return {
    ...stored,
    confidence: stored.confidence ?? null,
    createdAt: stored.createdAt ?? 0,
    editedAt: stored.editedAt ?? null,
  };
}

export function editedText(previous: string, text: string): string {
  const trimmed = text.trim();
  return trimmed.length === 0 ? previous : trimmed;
}

export function editedCapture(capture: Capture, text: string, editedAt: number): Capture {
  return { ...capture, text: editedText(capture.text, text), editedAt };
}

export function oldestFirst(captures: readonly Capture[]): readonly Capture[] {
  return captures.toSorted((earlier, later) => earlier.createdAt - later.createdAt);
}
