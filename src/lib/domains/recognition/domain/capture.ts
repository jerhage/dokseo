import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';

export type CaptureDraft = {
  readonly id: CaptureId;
  readonly bookId: BookId;
  readonly regions: readonly ImageRegion[];
  readonly text: string;
  readonly confidence: number | null;
};

export type Capture = CaptureDraft & { readonly createdAt: number };

export type StoredCapture = Omit<Capture, 'confidence' | 'createdAt'> & {
  readonly confidence?: number | null;
  readonly createdAt?: number | null;
};

export function takenCapture(draft: CaptureDraft, createdAt: number): Capture {
  return { ...draft, createdAt };
}

export function captureFromStored(stored: StoredCapture): Capture {
  return {
    ...stored,
    confidence: stored.confidence ?? null,
    createdAt: stored.createdAt ?? 0,
  };
}

export function oldestFirst(captures: readonly Capture[]): readonly Capture[] {
  return captures.toSorted((earlier, later) => earlier.createdAt - later.createdAt);
}
