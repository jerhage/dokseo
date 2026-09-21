import { match } from 'ts-pattern';
import type { ModelLoad, ModelLoadError } from './model-load';
import type { RecognizerSession } from '../engine/recognizer-session';

type DownloadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly load: ModelLoad | null }
  | { readonly kind: 'paused'; readonly load: ModelLoad | null }
  | { readonly kind: 'ready'; readonly session: RecognizerSession }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly cause: string };

type DownloadEvent =
  | { readonly kind: 'started' }
  | { readonly kind: 'advanced'; readonly load: ModelLoad }
  | { readonly kind: 'opened'; readonly session: RecognizerSession }
  | { readonly kind: 'held' }
  | { readonly kind: 'stopped' }
  | { readonly kind: 'settled'; readonly error: ModelLoadError };

const IDLE: DownloadState = { kind: 'idle' };

function downloadStep(state: DownloadState, event: DownloadEvent): DownloadState {
  return match(event)
    .with({ kind: 'started' }, (): DownloadState => ({ kind: 'loading', load: null }))
    .with({ kind: 'advanced' }, (advanced): DownloadState =>
      state.kind === 'loading' ? { kind: 'loading', load: advanced.load } : state,
    )
    .with({ kind: 'opened' }, (opened): DownloadState =>
      state.kind === 'loading' ? { kind: 'ready', session: opened.session } : state,
    )
    .with({ kind: 'held' }, (): DownloadState =>
      state.kind === 'loading' ? { kind: 'paused', load: state.load } : state,
    )
    .with({ kind: 'stopped' }, (): DownloadState =>
      state.kind === 'loading' ? { kind: 'cancelled' } : state,
    )
    .with({ kind: 'settled' }, (settled): DownloadState => {
      if (state.kind !== 'loading') return state;
      return match(settled.error)
        .with({ kind: 'cancelled' }, (): DownloadState => ({ kind: 'cancelled' }))
        .with({ kind: 'unavailable' }, (unavailable): DownloadState => ({
          kind: 'failed',
          cause: unavailable.cause,
        }))
        .exhaustive();
    })
    .exhaustive();
}

export { IDLE, downloadStep };
export type { DownloadState, DownloadEvent };
