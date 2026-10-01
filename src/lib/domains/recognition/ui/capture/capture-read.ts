import { match } from 'ts-pattern';

type CaptureRead =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready' };

type CaptureListBody = 'cards' | 'invitation' | 'nothing';

const READING: CaptureRead = { kind: 'loading' };

const READ: CaptureRead = { kind: 'ready' };

function readFailed(message: string): CaptureRead {
  return { kind: 'failed', message };
}

function captureListBody(read: CaptureRead, shown: number): CaptureListBody {
  if (shown > 0) return 'cards';

  return match(read)
    .with({ kind: 'loading' }, () => 'invitation' as const)
    .with({ kind: 'ready' }, () => 'invitation' as const)
    .with({ kind: 'failed' }, () => 'nothing' as const)
    .exhaustive();
}

export { READ, READING, captureListBody, readFailed };
export type { CaptureListBody, CaptureRead };
