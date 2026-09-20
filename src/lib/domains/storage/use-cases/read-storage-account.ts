import {
  belongsToModel,
  isRuntimeAsset,
  reportOf,
} from '$lib/domains/recognition/domain/model/model-cache';
import { everyModel } from '$lib/domains/recognition/domain/model/model-footprint';
import { ok, type Result } from '$lib/shared/result';
import type {
  CachedFile,
  OriginStores,
  OriginStoresError,
  StoredFile,
} from '../domain/origin-stores';
import {
  accountOf,
  filesAt,
  filesElsewhere,
  tallyDetail,
  tallyOf,
  type StorageAccount,
  type StoragePart,
  type Tally,
} from '../domain/storage-parts';

const BOOK_PLACE = 'blobs';

const PART_PLACE = 'partials';

const CACHE_UNREADABLE: StoragePart = {
  key: 'cached',
  label: 'Model weights and the ONNX runtime',
  detail: 'this browser exposes no cache, so they cannot be measured',
  bytes: null,
};

const FILES_UNREADABLE: StoragePart = {
  key: 'files',
  label: 'Books and part-downloads',
  detail: 'this browser exposes no private file system, so they cannot be measured',
  bytes: null,
};

const RECORDS: StoragePart = {
  key: 'records',
  label: 'Book records, captures and settings',
  detail:
    'text only — titles, reading positions, recognized lines and your choices — so this is small; the browser database reports no size to confirm it',
  bytes: null,
};

function describing(what: string, tally: Tally): string {
  return `${what} · ${tallyDetail(tally)}`;
}

export type ReadStorageAccountDeps = {
  readonly stores: OriginStores;
  readonly estimate: () => Promise<{ usage: number; quota: number } | null>;
  readonly persisted: () => Promise<boolean>;
};

function modelParts(cached: readonly CachedFile[]): {
  readonly parts: readonly StoragePart[];
  readonly rest: readonly CachedFile[];
} {
  const parts: StoragePart[] = [];
  let rest = cached;

  for (const known of everyModel()) {
    const mine = rest.filter((file) => belongsToModel(file.url, known.modelId));
    if (mine.length === 0) continue;

    rest = rest.filter((file) => !belongsToModel(file.url, known.modelId));
    const report = reportOf(mine, known.modelId);
    parts.push({
      key: known.modelId,
      label: known.label,
      detail: describing('the OCR weights and the configuration files beside them', report),
      bytes: report.bytes,
    });
  }

  return { parts, rest };
}

function cachedParts(cached: readonly CachedFile[]): readonly StoragePart[] {
  const { parts, rest } = modelParts(cached);
  const runtime = tallyOf(rest.filter((file) => isRuntimeAsset(file.url)));
  const other = tallyOf(rest.filter((file) => !isRuntimeAsset(file.url)));

  return [
    ...parts,
    ...(runtime.files === 0
      ? []
      : [
          {
            key: 'runtime',
            label: 'The ONNX runtime',
            detail: describing('the WebAssembly the model runs in, downloaded once', runtime),
            bytes: runtime.bytes,
          },
        ]),
    ...(other.files === 0
      ? []
      : [
          {
            key: 'other-cached',
            label: 'Other cached downloads',
            detail: describing('cached files belonging to no model this app offers', other),
            bytes: other.bytes,
          },
        ]),
  ];
}

function storedParts(files: readonly StoredFile[]): readonly StoragePart[] {
  const books = tallyOf(filesAt(files, BOOK_PLACE));
  const parts = tallyOf(filesAt(files, PART_PLACE));
  const elsewhere = tallyOf(filesElsewhere(files, [BOOK_PLACE, PART_PLACE]));

  return [
    {
      key: 'books',
      label: 'Books and their covers',
      detail: describing('the file you uploaded for each book, whole, and its cover', books),
      bytes: books.bytes,
    },
    ...(parts.files === 0
      ? []
      : [
          {
            key: 'partials',
            label: 'Part-downloaded weights',
            detail: describing('the bytes of a weight file a paused download kept', parts),
            bytes: parts.bytes,
          },
        ]),
    ...(elsewhere.files === 0
      ? []
      : [
          {
            key: 'other-files',
            label: 'Other files this app wrote',
            detail: describing('files outside the book and download folders', elsewhere),
            bytes: elsewhere.bytes,
          },
        ]),
  ];
}

export async function readStorageAccount(
  deps: ReadStorageAccountDeps,
): Promise<Result<StorageAccount, OriginStoresError>> {
  const surveyed = await deps.stores.survey();
  if (!surveyed.ok) return surveyed;

  const { cached, files } = surveyed.value;
  const parts = [
    ...(cached === null ? [CACHE_UNREADABLE] : cachedParts(cached)),
    ...(files === null ? [FILES_UNREADABLE] : storedParts(files)),
    RECORDS,
  ];

  const [space, persisted] = await Promise.all([deps.estimate(), deps.persisted()]);
  return ok(accountOf(parts, space, persisted));
}
