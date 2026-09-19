import { renderThumbnail } from '$lib/platform/image/thumbnail';
import { describeCause } from '$lib/shared/cause';
import { imageIndex } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import type { SourceKind } from '../domain/book';
import type { PageSource, PageSourceError } from '../domain/page-source';
import type { BuiltSource, SourceBuildError, SourceBuilder } from '../domain/source-builder';
import { detectSourceKind } from '../domain/source-detection';
import { suggestTitle } from '../domain/title';
import { entryName, titleCandidate } from './file-entry';

const COVER_MAX_WIDTH = 400;

function describePageSourceError(error: PageSourceError): string {
  if (error.kind === 'out-of-range') {
    return `Image ${error.index} lies outside a source of ${error.count} images`;
  }
  return error.cause;
}

async function sourceBlobOf(
  sourceKind: SourceKind,
  files: readonly File[],
): Promise<Result<Blob, SourceBuildError>> {
  if (sourceKind !== 'images') {
    const [container] = files;
    if (container === undefined) return err({ kind: 'empty' });
    return ok(container);
  }
  const { packImagesIntoArchive } = await import('./archive-packer');
  const packed = await packImagesIntoArchive(files);
  if (!packed.ok) return err({ kind: 'unreadable', cause: describePageSourceError(packed.error) });
  return packed;
}

async function openPages(
  sourceKind: SourceKind,
  blob: Blob,
): Promise<Result<PageSource, PageSourceError>> {
  if (sourceKind === 'pdf') {
    const { openPdfPageSource } = await import('./pdf-page-source');
    return openPdfPageSource(blob);
  }
  const { openArchivePageSource } = await import('./archive-page-source');
  return openArchivePageSource(blob);
}

async function buildFrom(files: readonly File[]): Promise<Result<BuiltSource, SourceBuildError>> {
  const sourceKind = detectSourceKind(files.map(entryName));
  if (sourceKind === null) return err({ kind: 'nothing-usable' });

  const source = await sourceBlobOf(sourceKind, files);
  if (!source.ok) return source;

  const opened = await openPages(sourceKind, source.value);
  if (!opened.ok) return err({ kind: 'unreadable', cause: describePageSourceError(opened.error) });

  using pages = opened.value;
  if (pages.count === 0) return err({ kind: 'nothing-usable' });

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
    imageCount: pages.count,
    cover,
    suggestedTitle: suggestTitle(files.map(titleCandidate)),
  });
}

export function createFileSourceBuilder(): SourceBuilder {
  return {
    async build(files: readonly File[]): Promise<Result<BuiltSource, SourceBuildError>> {
      if (files.length === 0) return err({ kind: 'empty' });
      try {
        const built = await buildFrom(files);
        return built;
      } catch (cause) {
        return err({ kind: 'unreadable', cause: describeCause(cause) });
      }
    },
  };
}
