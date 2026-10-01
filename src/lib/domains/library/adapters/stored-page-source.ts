import { match } from 'ts-pattern';
import type { PageNamesRead, PageSourceOpening } from '$lib/shared/page-source';
import type { IntrinsicSourceKind } from '../domain/book/page-list';

async function openStoredPageSource(
  sourceKind: IntrinsicSourceKind,
  blob: Blob,
): Promise<PageSourceOpening> {
  return match(sourceKind)
    .with('pdf', async () => {
      const { openPdfPageSource } = await import('./pdf-page-source');
      return openPdfPageSource(blob);
    })
    .with('epub', async () => {
      const { openEpubPageSource } = await import('./epub-page-source');
      return openEpubPageSource(blob);
    })
    .exhaustive();
}

async function openListedPageSource(
  blob: Blob,
  names: readonly string[],
): Promise<PageSourceOpening> {
  const { openArchivePageSource } = await import('./archive-page-source');
  return openArchivePageSource(blob, names);
}

async function listStoredPageNames(blob: Blob): Promise<PageNamesRead> {
  const { listArchivePageNames } = await import('./archive-page-source');
  return listArchivePageNames(blob);
}

export { listStoredPageNames, openListedPageSource, openStoredPageSource };
