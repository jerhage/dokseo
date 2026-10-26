import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { BookId } from '$lib/shared/ids';
import type { LibraryRepository, RemoteBookWriteResult } from '../domain/book/library-repository';

type ApplyRemoteBookRemovalResult = RemoteBookWriteResult;

type ApplyRemoteBookRemovalDeps = {
  readonly repository: LibraryRepository;
  readonly now: () => number;
};

function applyRemoteBookRemoval(
  deps: ApplyRemoteBookRemovalDeps,
  id: BookId,
  accepted: AcceptedVersion,
): Promise<ApplyRemoteBookRemovalResult> {
  return deps.repository.applyRemote({ kind: 'remove', id, removedAt: deps.now(), accepted });
}

export { applyRemoteBookRemoval };
export type { ApplyRemoteBookRemovalDeps, ApplyRemoteBookRemovalResult };
