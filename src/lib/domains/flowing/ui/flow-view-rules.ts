import { match } from 'ts-pattern';
import type { Container } from '$lib/container';

type SourceOutcome = Awaited<ReturnType<Container['library']['readSource']>>;

type SourceFailure = Exclude<SourceOutcome, { readonly kind: 'success' }>;

type PlaceOutcome = Awaited<ReturnType<Container['library']['saveReadingPlace']>>;

type LibraryFailure = Exclude<PlaceOutcome, { readonly kind: 'success' }>;

type FlowState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'opening' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'failed'; readonly message: string };

type FlowCurtain =
  | { readonly kind: 'none' }
  | { readonly kind: 'opening' }
  | { readonly kind: 'notice'; readonly message: string };

const NOTHING_OVER_THE_BOOK: FlowCurtain = { kind: 'none' };

const WAITING_FOR_THE_BOOK: FlowCurtain = { kind: 'opening' };

const SOURCE_MISSING =
  'The file of this book is missing from this device. Remove the book and add it again.';

function describeSourceFailure(error: SourceFailure): string {
  return match(error)
    .with({ kind: 'source-missing' }, () => SOURCE_MISSING)
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so that book cannot be read.',
    )
    .exhaustive();
}

function describePlaceFailure(error: LibraryFailure): string {
  return match(error)
    .with({ kind: 'not-found' }, () => 'That book is no longer stored on this device.')
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so your place cannot be kept.',
    )
    .exhaustive();
}

function curtainFor(state: FlowState): FlowCurtain {
  return match(state)
    .with({ kind: 'idle' }, () => NOTHING_OVER_THE_BOOK)
    .with({ kind: 'opening' }, () => WAITING_FOR_THE_BOOK)
    .with({ kind: 'ready' }, () => NOTHING_OVER_THE_BOOK)
    .with({ kind: 'failed' }, (stopped) => ({ kind: 'notice' as const, message: stopped.message }))
    .exhaustive();
}

export { SOURCE_MISSING, curtainFor, describePlaceFailure, describeSourceFailure };
export type { FlowCurtain, FlowState, PlaceOutcome, SourceOutcome };
