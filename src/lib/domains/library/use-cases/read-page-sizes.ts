import type { Size } from '$lib/shared/geometry';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';

function readPageSizes(
  source: PageSource,
): Promise<Result<readonly (Size | null)[], PageSourceError>> {
  return source.sizes();
}

export { readPageSizes };
