import { match } from 'ts-pattern';
import { readBoth } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import type { Capture, UnreadableCapture } from '../../domain/capture/capture';
import type { Tag } from '../../domain/tag/tag';

type CaptureRead =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready' };

type CaptureListBody = 'cards' | 'reading' | 'invitation' | 'nothing';

type CaptureListing = {
  readonly state: CaptureRead;
  readonly captures: readonly Capture[];
  readonly tags: readonly Tag[];
  readonly unreadable: readonly UnreadableCapture[];
  reload(): void;
};

const READING: CaptureRead = { kind: 'loading' };

const READ: CaptureRead = { kind: 'ready' };

const UNLISTED: CaptureListing = {
  state: READING,
  captures: [],
  tags: [],
  unreadable: [],
  reload: () => undefined,
};

function readFailed(message: string): CaptureRead {
  return { kind: 'failed', message };
}

function captureReadOf(
  captures: ReadState<readonly Capture[]>,
  tags: ReadState<readonly Tag[]>,
): CaptureRead {
  return match(readBoth(captures, tags, () => null))
    .with({ kind: 'loading' }, () => READING)
    .with({ kind: 'failed' }, (failed) => readFailed(failed.message))
    .with({ kind: 'ready' }, () => READ)
    .exhaustive();
}

function captureListBody(read: CaptureRead, shown: number): CaptureListBody {
  if (shown > 0) return 'cards';

  return match(read)
    .with({ kind: 'loading' }, () => 'reading' as const)
    .with({ kind: 'ready' }, () => 'invitation' as const)
    .with({ kind: 'failed' }, () => 'nothing' as const)
    .exhaustive();
}

export { READ, READING, UNLISTED, captureListBody, captureReadOf, readFailed };
export type { CaptureListBody, CaptureListing, CaptureRead };
