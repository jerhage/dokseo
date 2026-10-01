import { match } from 'ts-pattern';
import type { LibraryError } from '../domain/book/library-repository';

function describeLibraryError(error: LibraryError): string {
  return match(error)
    .with({ kind: 'not-found' }, () => 'That upload is no longer in your library.')
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so uploads cannot be kept.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

export { describeLibraryError };
