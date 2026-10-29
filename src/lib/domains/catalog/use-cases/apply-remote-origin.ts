import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { BookOrigin } from '../domain/book-origin';
import type { OriginRepository } from '../domain/origin-repository';

type ApplyRemoteOriginResult =
  | { readonly kind: 'success'; readonly recorded: boolean }
  | StorageUnavailable;

type ApplyRemoteOriginDeps = { readonly origins: OriginRepository };

const KEPT: ApplyRemoteOriginResult = { kind: 'success', recorded: false };

async function applyRemoteOrigin(
  deps: ApplyRemoteOriginDeps,
  origin: BookOrigin,
): Promise<ApplyRemoteOriginResult> {
  const held = await deps.origins.findByBook(origin.bookId);
  if (held.kind === 'storage-unavailable') return held;
  if (held.kind === 'success' && held.origin !== null) return KEPT;

  const recorded = await deps.origins.put(origin);
  if (recorded.kind !== 'success') return recorded;
  return { kind: 'success', recorded: true };
}

export { applyRemoteOrigin };
export type { ApplyRemoteOriginDeps, ApplyRemoteOriginResult };
