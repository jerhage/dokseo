import type {
  RememberedPasswordListing,
  RememberedPasswords,
} from '../domain/remembered-passwords';

type ListRememberedPasswordsResult = RememberedPasswordListing;

type ListRememberedPasswordsDeps = { readonly remembered: RememberedPasswords };

function listRememberedPasswords(
  deps: ListRememberedPasswordsDeps,
): Promise<ListRememberedPasswordsResult> {
  return deps.remembered.list();
}

export { listRememberedPasswords };
export type { ListRememberedPasswordsDeps, ListRememberedPasswordsResult };
