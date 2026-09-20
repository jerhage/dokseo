import { match } from 'ts-pattern';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';
import type { SourceKind } from '../domain/book/book';

async function openStoredPageSource(
  sourceKind: SourceKind,
  blob: Blob,
): Promise<Result<PageSource, PageSourceError>> {
  return match(sourceKind)
    .with('pdf', async () => {
      const { openPdfPageSource } = await import('./pdf-page-source');
      return openPdfPageSource(blob);
    })
    .with('images', 'archive', async () => {
      const { openArchivePageSource } = await import('./archive-page-source');
      return openArchivePageSource(blob);
    })
    .exhaustive();
}

export { openStoredPageSource };
