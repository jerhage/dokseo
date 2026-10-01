import type { Size } from '$lib/shared/geometry';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';

type ReadPageSizesResult =
  | { readonly kind: 'success'; readonly sizes: readonly (Size | null)[] }
  | PageSourceError;

function readPageSizes(source: PageSource): Promise<ReadPageSizesResult> {
  return source.sizes();
}

export { readPageSizes };
export type { ReadPageSizesResult };
