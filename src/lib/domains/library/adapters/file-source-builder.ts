import { match } from 'ts-pattern';
import { renderThumbnail } from '$lib/platform/image/thumbnail';
import { describeCause } from '$lib/shared/cause';
import { imageIndex } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { SourceKind } from '../domain/book/book';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import type { PageObstacle } from '../domain/ingest/epub-pages';
import type { BuiltSource, SourceBuildError, SourceBuilder } from '../domain/ingest/source-builder';
import { INSPECTING } from '../domain/ingest/upload-progress';
import type { UploadReport } from '../domain/ingest/upload-progress';
import { detectSourceKind } from '../domain/ingest/source-detection';
import { suggestTitle } from '../domain/book/title';
import { entryName, titleCandidate } from './file-entry';
import { openStoredPageSource } from './stored-page-source';

const COVER_MAX_WIDTH = 400;

function describePageSourceError(error: PageSourceError): string {
  return match(error)
    .with(
      { kind: 'out-of-range' },
      (range) => `Image ${range.index} lies outside a source of ${range.count} images`,
    )
    .with({ kind: 'page-unreadable' }, (unread) => unread.cause)
    .with({ kind: 'decode-failed' }, (decode) => decode.cause)
    .with({ kind: 'render-failed' }, (render) => render.cause)
    .with({ kind: 'source-unreadable' }, (unreadable) => unreadable.cause)
    .exhaustive();
}

async function sourceBlobOf(
  sourceKind: SourceKind,
  files: readonly File[],
  report: UploadReport,
): Promise<Result<Blob, SourceBuildError>> {
  if (sourceKind !== 'images') {
    const [container] = files;
    if (container === undefined) return err({ kind: 'empty' });
    return ok(container);
  }
  const { packImagesIntoArchive } = await import('./archive-packer');
  const packed = await packImagesIntoArchive(files, (packedCount, total) => {
    report({ kind: 'packing', packed: packedCount, total });
  });
  if (!packed.ok) return err({ kind: 'unreadable', cause: describePageSourceError(packed.error) });
  return packed;
}

type OpenedPages =
  | { readonly kind: 'source'; readonly source: PageSource }
  | {
      readonly kind: 'unpaged';
      readonly obstacle: PageObstacle;
      readonly cover: Blob | null;
    };

async function epubPages(blob: Blob): Promise<Result<OpenedPages, SourceBuildError>> {
  const { openEpubBook } = await import('./epub-page-source');
  const opened = await openEpubBook(blob);
  if (!opened.ok) return err({ kind: 'unreadable', cause: describePageSourceError(opened.error) });
  if (opened.value.kind === 'not-paged') {
    return ok({ kind: 'unpaged', obstacle: opened.value.obstacle, cover: opened.value.cover });
  }
  return ok({ kind: 'source', source: opened.value.source });
}

async function pagesOf(
  sourceKind: SourceKind,
  blob: Blob,
): Promise<Result<OpenedPages, SourceBuildError>> {
  if (sourceKind === 'epub') {
    const epub = await epubPages(blob);
    return epub;
  }
  const opened = await openStoredPageSource(sourceKind, blob);
  if (!opened.ok) return err({ kind: 'unreadable', cause: describePageSourceError(opened.error) });
  return ok({ kind: 'source', source: opened.value });
}

async function buildFrom(
  files: readonly File[],
  report: UploadReport,
): Promise<Result<BuiltSource, SourceBuildError>> {
  report(INSPECTING);
  const sourceKind = detectSourceKind(files.map(entryName));
  if (sourceKind === null) return err({ kind: 'nothing-usable' });

  const source = await sourceBlobOf(sourceKind, files, report);
  if (!source.ok) return source;

  report({ kind: 'opening', sourceKind });
  const opened = await pagesOf(sourceKind, source.value);
  if (!opened.ok) return opened;

  const suggestedTitle = suggestTitle(files.map(titleCandidate));
  if (opened.value.kind === 'unpaged') {
    return ok({
      blob: source.value,
      sourceKind,
      suggestedTitle,
      pages: { kind: 'unpaged', obstacle: opened.value.obstacle, cover: opened.value.cover },
    });
  }

  using pages = opened.value.source;
  if (pages.count === 0) return err({ kind: 'nothing-usable' });

  report({ kind: 'covering', imageCount: pages.count });
  const first = await pages.image(imageIndex(0));
  if (!first.ok) return err({ kind: 'unreadable', cause: describePageSourceError(first.error) });

  let cover: Blob;
  try {
    cover = await renderThumbnail(first.value, COVER_MAX_WIDTH);
  } finally {
    first.value.close();
  }

  return ok({
    blob: source.value,
    sourceKind,
    suggestedTitle,
    pages: { kind: 'images', imageCount: pages.count, cover },
  });
}

function createFileSourceBuilder(): SourceBuilder {
  return {
    async build(
      files: readonly File[],
      report: UploadReport = () => undefined,
    ): Promise<Result<BuiltSource, SourceBuildError>> {
      if (files.length === 0) return err({ kind: 'empty' });
      try {
        const built = await buildFrom(files, report);
        return built;
      } catch (cause) {
        return err({ kind: 'unreadable', cause: describeCause(cause) });
      }
    },
  };
}

export { createFileSourceBuilder };
