import type { BookOrigin } from '../domain/book-origin';
import type { OriginRepository, OriginWrite } from '../domain/origin-repository';

type RecordOriginResult = OriginWrite;

type RecordOriginDeps = { readonly origins: OriginRepository };

function recordOrigin(deps: RecordOriginDeps, origin: BookOrigin): Promise<RecordOriginResult> {
  return deps.origins.put(origin);
}

export { recordOrigin };
export type { RecordOriginDeps, RecordOriginResult };
