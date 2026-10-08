import type { BookId } from '$lib/shared/ids';
import type { Book } from '../domain/book/book';
import { replacedFile } from '../domain/book/book-replacement';
import type { UploadReport } from '../domain/ingest/upload-progress';
import { inspectedUpload, uploadIdentity } from './open-file';
import type { OpenFileDeps, OpenFileFailure } from './open-file';

type ReplaceBookFileResult =
  | { readonly kind: 'replaced'; readonly book: Book }
  | { readonly kind: 'not-found'; readonly id: BookId }
  | { readonly kind: 'same-file'; readonly book: Book }
  | { readonly kind: 'already-held'; readonly book: Book }
  | OpenFileFailure;

type ReplaceBookFileDeps = Pick<
  OpenFileDeps,
  'repository' | 'builder' | 'inspectEpub' | 'partialMd5'
>;

const NO_REPORT: UploadReport = () => undefined;

async function replaceBookFile(
  deps: ReplaceBookFileDeps,
  id: BookId,
  files: readonly File[],
): Promise<ReplaceBookFileResult> {
  const listed = await deps.repository.list();
  if (listed.kind !== 'success') return listed;
  const book = listed.books.find((held) => held.id === id);
  if (book === undefined) return { kind: 'not-found', id };

  const identified = await uploadIdentity(deps, files);
  if (identified.kind !== 'success') return identified;
  const { contentHash, fileName } = identified.identity;

  if (contentHash === book.contentHash) return { kind: 'same-file', book };
  const twin = listed.books.find((held) => held.contentHash === contentHash);
  if (twin !== undefined) return { kind: 'already-held', book: twin };

  const inspected = await inspectedUpload(deps, files, NO_REPORT);
  if (inspected.kind !== 'success') return inspected;
  const { built, content } = inspected.upload;

  const replacement = replacedFile(book, {
    sourceKind: built.sourceKind,
    contentHash,
    fileName,
    layoutKind: content.layoutKind,
    imageCount: content.imageCount,
  });
  const stored = await deps.repository.replaceFile(
    replacement,
    built.blob,
    content.cover,
    content.order,
    () => undefined,
  );
  if (stored.kind !== 'success') return stored;

  return { kind: 'replaced', book: replacement };
}

export { replaceBookFile };
export type { ReplaceBookFileDeps, ReplaceBookFileResult };
