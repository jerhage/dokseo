import { match } from 'ts-pattern';
import type { Anchor } from '$lib/shared/anchor';
import type { CaptureId, TagId } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { RecognizedText } from '../../domain/engine/recognized-text';

type CaptureStatus = 'pending' | 'done' | 'empty' | 'failed';

type Recorded = {
  readonly id: CaptureId;
  readonly anchor: Anchor;
  readonly tagIds: readonly TagId[];
};

type Taken =
  | (Recorded & { readonly origin: 'recognized'; readonly note: string | null })
  | (Recorded & { readonly origin: 'lifted'; readonly note: string | null })
  | (Recorded & { readonly origin: 'written' });

type Settled =
  | { readonly status: 'done'; readonly text: RecognizedText; readonly edited: boolean }
  | { readonly status: 'empty' }
  | { readonly status: 'failed'; readonly message: string };

type PanelCapture = (Taken & { readonly status: 'pending' }) | (Taken & Settled);

function cardOf(capture: Capture): PanelCapture {
  const held = {
    id: capture.id,
    anchor: capture.anchor,
    tagIds: capture.tagIds,
    status: 'done' as const,
    edited: capture.editedAt !== null,
  };

  return match(capture)
    .with({ origin: 'written' }, (note) => ({
      ...held,
      origin: 'written' as const,
      text: recognizedText(note.text, null),
    }))
    .with({ origin: 'lifted' }, (lifted) => ({
      ...held,
      origin: 'lifted' as const,
      note: lifted.note,
      text: recognizedText(lifted.text, null),
    }))
    .with({ origin: 'recognized' }, (read) => ({
      ...held,
      origin: 'recognized' as const,
      note: read.note,
      text: recognizedText(read.text, read.confidence),
    }))
    .exhaustive();
}

function takenOf(capture: PanelCapture): Taken {
  const held = { id: capture.id, anchor: capture.anchor, tagIds: capture.tagIds };

  return match(capture)
    .with({ origin: 'written' }, () => ({ ...held, origin: 'written' as const }))
    .with({ origin: 'lifted' }, (lifted) => ({
      ...held,
      origin: 'lifted' as const,
      note: lifted.note,
    }))
    .with({ origin: 'recognized' }, (read) => ({
      ...held,
      origin: 'recognized' as const,
      note: read.note,
    }))
    .exhaustive();
}

export { cardOf, takenOf };
export type { CaptureStatus, PanelCapture, Settled, Taken };
