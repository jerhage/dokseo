import { match } from 'ts-pattern';
import { renderThumbnail } from '$lib/platform/image/thumbnail';
import { describeCause } from '$lib/shared/cause';
import { imageIndex } from '$lib/shared/ids';
import type { SourceKind } from '../domain/book/book';
import { INTRINSIC_ORDER } from '../domain/book/page-list';
import type { PageOrder } from '../domain/book/page-list';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import type { PageObstacle } from '../domain/ingest/epub-pages';
import { uploadBreach } from '../domain/ingest/ingest-limits';
import type { SourceBuild, SourceBuildError, SourceBuilder } from '../domain/ingest/source-builder';
import { INSPECTING } from '../domain/ingest/upload-progress';
import type { StageReport } from '../domain/ingest/upload-progress';
import { detectSourceKind } from '../domain/ingest/source-detection';
import { suggestTitle } from '../domain/book/title';
import { entryName, titleCandidate } from './file-entry';
import { listStoredPageNames, openListedPageSource } from './stored-page-source';

const COVER_MAX_WIDTH = 400;

type SourceBlob = { readonly kind: 'success'; readonly blob: Blob } | SourceBuildError;

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
  report: StageReport,
): Promise<SourceBlob> {
  if (sourceKind !== 'images') {
    const [container] = files;
    if (container === undefined) return { kind: 'empty' };
    return { kind: 'success', blob: container };
  }
  const { packImagesIntoArchive } = await import('./archive-packer');
  const packed = await packImagesIntoArchive(files, (packedCount, total) => {
    report({ kind: 'packing', packed: packedCount, total });
  });
  if (packed.kind !== 'success') {
    return { kind: 'unreadable', cause: describePageSourceError(packed) };
  }
  return { kind: 'success', blob: packed.archive };
}

type OpenedPages =
  | {
      readonly kind: 'source';
      readonly source: PageSource;
      readonly order: PageOrder;
      readonly metadataTitle: string | null;
    }
  | {
      readonly kind: 'unpaged';
      readonly obstacle: PageObstacle;
      readonly cover: Blob | null;
    };

type PagesOpening = { readonly kind: 'success'; readonly opened: OpenedPages } | SourceBuildError;

function unreadablePages(error: PageSourceError): SourceBuildError {
  return { kind: 'unreadable', cause: describePageSourceError(error) };
}

async function epubPages(blob: Blob): Promise<PagesOpening> {
  const { openEpubBook } = await import('./epub-page-source');
  const opened = await openEpubBook(blob);
  return match(opened)
    .returnType<PagesOpening>()
    .with({ kind: 'paged' }, ({ source }) => ({
      kind: 'success',
      opened: { kind: 'source', source, order: INTRINSIC_ORDER, metadataTitle: null },
    }))
    .with({ kind: 'not-paged' }, ({ obstacle, cover }) => ({
      kind: 'success',
      opened: { kind: 'unpaged', obstacle, cover },
    }))
    .with(
      { kind: 'out-of-range' },
      { kind: 'page-unreadable' },
      { kind: 'decode-failed' },
      { kind: 'render-failed' },
      { kind: 'source-unreadable' },
      unreadablePages,
    )
    .exhaustive();
}

async function pdfPages(blob: Blob): Promise<PagesOpening> {
  const { openPdfBook } = await import('./pdf-page-source');
  const opened = await openPdfBook(blob);
  if (opened.kind !== 'success') return unreadablePages(opened);
  return {
    kind: 'success',
    opened: {
      kind: 'source',
      source: opened.pages,
      order: INTRINSIC_ORDER,
      metadataTitle: opened.metadataTitle,
    },
  };
}

async function listedPages(blob: Blob): Promise<PagesOpening> {
  const listed = await listStoredPageNames(blob);
  if (listed.kind !== 'success') return unreadablePages(listed);
  const names = listed.names;
  const opened = await openListedPageSource(blob, names);
  if (opened.kind !== 'success') return unreadablePages(opened);
  return {
    kind: 'success',
    opened: {
      kind: 'source',
      source: opened.pages,
      order: { kind: 'listed', names },
      metadataTitle: null,
    },
  };
}

function pagesOf(sourceKind: SourceKind, blob: Blob): Promise<PagesOpening> {
  return match(sourceKind)
    .with('epub', () => epubPages(blob))
    .with('pdf', () => pdfPages(blob))
    .with('images', 'archive', () => listedPages(blob))
    .exhaustive();
}

async function buildFrom(files: readonly File[], report: StageReport): Promise<SourceBuild> {
  report(INSPECTING);
  const sourceKind = detectSourceKind(files.map(entryName));
  if (sourceKind === null) return { kind: 'nothing-usable' };

  const source = await sourceBlobOf(sourceKind, files, report);
  if (source.kind !== 'success') return source;
  const blob = source.blob;

  if (sourceKind !== 'pdf') {
    const { archiveLimitBreach } = await import('./archive-census');
    const breach = await archiveLimitBreach(blob);
    if (breach !== null) return { kind: 'refused', limit: breach };
  }

  report({ kind: 'opening', sourceKind });
  const opening = await pagesOf(sourceKind, blob);
  if (opening.kind !== 'success') return opening;
  const opened = opening.opened;

  const suggestedTitle = suggestTitle(sourceKind, files.map(titleCandidate));
  if (opened.kind === 'unpaged') {
    return {
      kind: 'success',
      source: {
        blob,
        sourceKind,
        suggestedTitle,
        metadataTitle: null,
        pages: { kind: 'unpaged', obstacle: opened.obstacle, cover: opened.cover },
      },
    };
  }

  const order = opened.order;
  using pages = opened.source;
  if (pages.count === 0) return { kind: 'nothing-usable' };

  report({ kind: 'covering', imageCount: pages.count });
  const first = await pages.image(imageIndex(0));
  if (first.kind !== 'success') return unreadablePages(first);

  let cover: Blob;
  try {
    cover = await renderThumbnail(first.image, COVER_MAX_WIDTH);
  } finally {
    first.image.close();
  }

  return {
    kind: 'success',
    source: {
      blob,
      sourceKind,
      suggestedTitle,
      metadataTitle: opened.metadataTitle,
      pages: { kind: 'images', imageCount: pages.count, cover, order },
    },
  };
}

function createFileSourceBuilder(): SourceBuilder {
  return {
    async build(
      files: readonly File[],
      report: StageReport = () => undefined,
    ): Promise<SourceBuild> {
      if (files.length === 0) return { kind: 'empty' };
      const breach = uploadBreach(files);
      if (breach !== null) return { kind: 'refused', limit: breach };
      try {
        const built = await buildFrom(files, report);
        return built;
      } catch (cause) {
        return { kind: 'unreadable', cause: describeCause(cause) };
      }
    },
  };
}

export { createFileSourceBuilder };
