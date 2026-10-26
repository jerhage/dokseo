import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { LibraryRepository, LibraryWrite } from '../domain/book/library-repository';

type AcceptRemoteBookVersionResult = LibraryWrite;

type AcceptRemoteBookVersionDeps = { readonly repository: LibraryRepository };

function acceptRemoteBookVersion(
  deps: AcceptRemoteBookVersionDeps,
  accepted: AcceptedVersion,
): Promise<AcceptRemoteBookVersionResult> {
  return deps.repository.acceptRemoteVersion(accepted);
}

export { acceptRemoteBookVersion };
export type { AcceptRemoteBookVersionDeps, AcceptRemoteBookVersionResult };
