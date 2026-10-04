import { match } from 'ts-pattern';
import { DEFAULT_PAGE_PAIRING } from '$lib/domains/library/domain/book/book';
import type { Book } from '$lib/domains/library/domain/book/book';
import {
  joinUpload,
  mergeableRows,
  restorableMatch,
} from '$lib/domains/library/domain/book/book-matching';
import type {
  BookMatching,
  MatchProbe,
  RestorableIdentity,
} from '$lib/domains/library/domain/book/book-matching';
import {
  fingerprintedFiles,
  splitUpload,
} from '$lib/domains/library/domain/ingest/source-detection';
import type { UploadEntry } from '$lib/domains/library/domain/ingest/source-detection';
import { uploadManifest } from '$lib/domains/library/domain/ingest/upload-manifest';
import type { ManifestEntry } from '$lib/domains/library/domain/ingest/upload-manifest';
import { uploadName } from '$lib/domains/library/domain/ingest/upload-name';
import { PARTIAL_MD5_SAMPLE_BYTES, partialMd5Offsets } from '$lib/platform/crypto/partial-md5';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';

type SampleSpan =
  | { readonly kind: 'read'; readonly offset: number; readonly length: number }
  | { readonly kind: 'past-the-end'; readonly offset: number };

type UploadFile = UploadEntry & ManifestEntry;

type HashedPart<F extends UploadFile> =
  | { readonly kind: 'file'; readonly file: F }
  | { readonly kind: 'manifest'; readonly manifest: string; readonly kept: readonly F[] };

type HashedBook<F extends UploadFile> = {
  readonly fileName: string;
  readonly part: HashedPart<F>;
  readonly ignored: readonly F[];
};

type HoldingKind = 'shelf' | 'removed' | 'unreadable';

type Holding = {
  readonly id: string;
  readonly kind: HoldingKind;
  readonly title: string;
  readonly fileName: string;
  readonly contentHash: string;
  readonly addedAt: number;
};

type DescribedUpload = MatchProbe;

type MatchStep = 'content' | 'file-name' | 'title';

type MatchOutcome =
  | {
      readonly kind: 'already-held';
      readonly join: 'by-content' | 'by-name';
      readonly holding: Holding;
      readonly merged: readonly Holding[];
    }
  | { readonly kind: 'restored'; readonly holding: Holding; readonly step: MatchStep }
  | { readonly kind: 'added' };

const ADDED: MatchOutcome = { kind: 'added' };

const NO_TEXT = '';

function sampleSpans(size: number): readonly SampleSpan[] {
  return partialMd5Offsets().map((offset): SampleSpan => {
    if (offset >= size) return { kind: 'past-the-end', offset };
    return { kind: 'read', offset, length: Math.min(PARTIAL_MD5_SAMPLE_BYTES, size - offset) };
  });
}

function bytesSampled(size: number): number {
  return sampleSpans(size).reduce(
    (total, span) => (span.kind === 'read' ? total + span.length : total),
    0,
  );
}

function hashedPart<F extends UploadFile>(files: readonly F[]): HashedPart<F> {
  const kept = fingerprintedFiles(files);
  const [only] = kept;
  if (kept.length === 1 && only !== undefined) return { kind: 'file', file: only };
  return { kind: 'manifest', manifest: uploadManifest(kept), kept };
}

function hashedBooks<F extends UploadFile>(files: readonly F[]): readonly HashedBook<F>[] {
  return splitUpload(files).map((book) => {
    const part = hashedPart(book.files);
    const hashed = new Set<F>(part.kind === 'file' ? [part.file] : part.kept);
    return {
      fileName: uploadName(book.files),
      part,
      ignored: book.files.filter((file) => !hashed.has(file)),
    };
  });
}

function shelfBook(holding: Holding): Book {
  return {
    id: bookId(holding.id),
    title: holding.title,
    alias: null,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: DEFAULT_PAGE_PAIRING,
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash(holding.contentHash),
    fileName: holding.fileName,
    imageCount: 1,
    addedAt: holding.addedAt,
    position: imagePlace(imageIndex(0)),
    lastReadAt: null,
    finishedAt: null,
  };
}

type RestorableHolding = RestorableIdentity & { readonly holding: Holding };

function restorable(holding: Holding): RestorableHolding {
  return {
    id: bookId(holding.id),
    title: holding.title,
    contentHash: holding.contentHash,
    fileName: holding.fileName,
    addedAt: holding.addedAt,
    holding,
  };
}

function ofKind(holdings: readonly Holding[], kind: HoldingKind): readonly Holding[] {
  return holdings.filter((holding) => holding.kind === kind);
}

function heldHolding(holdings: readonly Holding[], id: BookId): Holding | null {
  return holdings.find((holding) => holding.id === id) ?? null;
}

const STEP_PROBES: readonly {
  readonly step: MatchStep;
  readonly probe: (upload: DescribedUpload) => DescribedUpload;
}[] = [
  {
    step: 'content',
    probe: (upload) => ({ ...upload, fileName: NO_TEXT, title: NO_TEXT, fileTitle: NO_TEXT }),
  },
  { step: 'file-name', probe: (upload) => ({ ...upload, title: NO_TEXT, fileTitle: NO_TEXT }) },
  { step: 'title', probe: (upload) => upload },
];

function restoreStep(
  candidates: {
    readonly removed: readonly RestorableHolding[];
    readonly unreadable: readonly RestorableHolding[];
  },
  upload: DescribedUpload,
): { readonly holding: Holding; readonly step: MatchStep } | null {
  for (const { step, probe } of STEP_PROBES) {
    const found = restorableMatch(candidates, probe(upload));
    if (found !== null) return { holding: found.holding, step };
  }
  return null;
}

function matchOutcome(
  holdings: readonly Holding[],
  upload: DescribedUpload,
  matching: BookMatching,
): MatchOutcome {
  const shelf = ofKind(holdings, 'shelf').map(shelfBook);
  const unreadable = ofKind(holdings, 'unreadable').map(restorable);
  const joined = joinUpload(
    shelf,
    { contentHash: contentHash(upload.contentHash), fileName: upload.fileName },
    matching,
  );

  return match(joined)
    .returnType<MatchOutcome>()
    .with({ kind: 'by-content' }, { kind: 'by-name' }, ({ kind, book }) => {
      const holding = heldHolding(holdings, book.id);
      if (holding === null) return ADDED;
      const merged = mergeableRows(unreadable, {
        contentHash: upload.contentHash,
        fileName: upload.fileName,
        title: book.title,
        fileTitle: upload.fileTitle,
      })
        .filter((row) => row.id !== book.id)
        .map((row) => row.holding);
      return { kind: 'already-held', join: kind, holding, merged };
    })
    .with({ kind: 'new' }, () => {
      const restoring = restoreStep(
        { removed: ofKind(holdings, 'removed').map(restorable), unreadable },
        upload,
      );
      return restoring === null ? ADDED : { kind: 'restored', ...restoring };
    })
    .exhaustive();
}

export { bytesSampled, hashedBooks, matchOutcome, sampleSpans };
export type {
  DescribedUpload,
  HashedBook,
  HashedPart,
  Holding,
  HoldingKind,
  MatchOutcome,
  MatchStep,
  SampleSpan,
  UploadFile,
};
