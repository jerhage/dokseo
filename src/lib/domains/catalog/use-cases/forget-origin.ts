import type { BookId } from '$lib/shared/ids';
import type { OriginRepository, OriginWrite } from '../domain/origin-repository';

type ForgetOriginResult = OriginWrite;

type ForgetOriginDeps = { readonly origins: OriginRepository };

function forgetOrigin(deps: ForgetOriginDeps, bookId: BookId): Promise<ForgetOriginResult> {
  return deps.origins.deleteByBook(bookId);
}

export { forgetOrigin };
export type { ForgetOriginDeps, ForgetOriginResult };
