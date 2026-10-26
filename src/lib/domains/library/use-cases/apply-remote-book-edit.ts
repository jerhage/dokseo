import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { BookId } from '$lib/shared/ids';
import type { BookEdit } from '../domain/book/book';
import type { LibraryRepository, RemoteBookWriteResult } from '../domain/book/library-repository';

type ApplyRemoteBookEditResult = RemoteBookWriteResult;

type ApplyRemoteBookEditDeps = { readonly repository: LibraryRepository };

function applyRemoteBookEdit(
  deps: ApplyRemoteBookEditDeps,
  id: BookId,
  edit: BookEdit,
  accepted: AcceptedVersion,
): Promise<ApplyRemoteBookEditResult> {
  return deps.repository.applyRemote({ kind: 'edit', id, edit, accepted });
}

export { applyRemoteBookEdit };
export type { ApplyRemoteBookEditDeps, ApplyRemoteBookEditResult };
