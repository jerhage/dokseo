import { listBooks } from '$lib/domains/library/use-cases/list-books';
import type { ListBooksDeps } from '$lib/domains/library/use-cases/list-books';
import { listRestorableBooks } from '$lib/domains/library/use-cases/list-restorable-books';
import type { ListRestorableBooksDeps } from '$lib/domains/library/use-cases/list-restorable-books';
import { listEveryCapture } from '$lib/domains/recognition/use-cases/capture/list-every-capture';
import type { ListEveryCaptureDeps } from '$lib/domains/recognition/use-cases/capture/list-every-capture';
import { listTags } from '$lib/domains/recognition/use-cases/tag/list-tags';
import type { ListTagsDeps } from '$lib/domains/recognition/use-cases/tag/list-tags';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { planCapturesImport } from './captures-import-plan';
import type { CapturesImportPlan } from './captures-import-plan';
import { readCapturesFile } from './read-captures-file';

type PreviewCapturesImportResult =
  | { readonly kind: 'success'; readonly plan: CapturesImportPlan }
  | { readonly kind: 'not-an-export' }
  | { readonly kind: 'newer-version'; readonly version: number }
  | StorageUnavailable;

type PreviewCapturesImportDeps = {
  readonly shelf: ListBooksDeps;
  readonly restorable: ListRestorableBooksDeps;
  readonly tags: ListTagsDeps;
  readonly captures: ListEveryCaptureDeps;
  readonly newId: () => string;
  readonly now: () => number;
};

async function previewCapturesImport(
  deps: PreviewCapturesImportDeps,
  text: string,
): Promise<PreviewCapturesImportResult> {
  const read = readCapturesFile(text);
  if (read.kind !== 'read') return read;

  const [shelf, restorable, tags, captures] = await Promise.all([
    listBooks(deps.shelf),
    listRestorableBooks(deps.restorable),
    listTags(deps.tags),
    listEveryCapture(deps.captures),
  ]);
  if (shelf.kind !== 'success') return shelf;
  if (restorable.kind !== 'success') return restorable;
  if (tags.kind !== 'success') return tags;
  if (captures.kind !== 'success') return captures;

  const plan = planCapturesImport(
    read,
    {
      shelf: shelf.books,
      restorable: { removed: restorable.removed, unreadable: restorable.unreadable },
      tags: tags.tags,
      unreadableTagIds: tags.unreadable.map((tag) => tag.id),
      captures: captures.captures,
    },
    { newId: deps.newId, now: deps.now },
  );
  return { kind: 'success', plan };
}

export { previewCapturesImport };
export type { PreviewCapturesImportDeps, PreviewCapturesImportResult };
