import { match } from 'ts-pattern';
import type { PageSourceError } from '$lib/shared/page-source';
import { describeEditFailure } from './book-preferences.svelte';
import type { OpenOutcome } from './reader-opening';

type OpenFailure = Exclude<OpenOutcome, { readonly kind: 'images' | 'flow' }>;

const SOURCE_MISSING =
  'The file of this book is missing from this device. Remove the book and add it again.';

const UNREADABLE_BOOK =
  'This book was stored in a shape this version cannot read. Upload the same file again in the library to repair it.';

function describeSourceFailure(error: PageSourceError): string {
  return match(error)
    .with(
      { kind: 'out-of-range' },
      (range) => `This book holds ${range.count} images, so page ${range.index + 1} is not there.`,
    )
    .with(
      { kind: 'page-unreadable' },
      (failed) => `A page could not be read from that book: ${failed.cause}`,
    )
    .with({ kind: 'decode-failed' }, (failed) => `A page could not be decoded: ${failed.cause}`)
    .with({ kind: 'render-failed' }, (failed) => `A page could not be rendered: ${failed.cause}`)
    .with(
      { kind: 'source-unreadable' },
      (unreadable) => `That book could not be read: ${unreadable.cause}`,
    )
    .exhaustive();
}

function lostBook(error: OpenFailure): boolean {
  return error.kind === 'not-found';
}

function describeOpenFailure(error: OpenFailure): string {
  return match(error)
    .with({ kind: 'unreadable' }, (failed) => describeSourceFailure(failed.failure))
    .with({ kind: 'not-found' }, { kind: 'storage-unavailable' }, describeEditFailure)
    .with({ kind: 'source-missing' }, () => SOURCE_MISSING)
    .with({ kind: 'unreadable-book' }, () => UNREADABLE_BOOK)
    .exhaustive();
}

export { SOURCE_MISSING, describeOpenFailure, describeSourceFailure, lostBook };
export type { OpenFailure };
