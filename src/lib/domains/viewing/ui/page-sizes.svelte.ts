import type { Size } from '$lib/shared/geometry';
import type { ImageIndex } from '$lib/shared/ids';
import { withSize } from './page-grouping-rules';
import type { PageSizes } from './page-grouping-rules';

function createPageSizes() {
  let sizes = $state.raw<PageSizes>([]);

  return {
    get sizes(): PageSizes {
      return sizes;
    },
    set(next: PageSizes): void {
      sizes = next;
    },
    reset(): void {
      sizes = [];
    },
    measure(index: ImageIndex, size: Size): void {
      sizes = withSize(sizes, index, size);
    },
  };
}

type PageSizesHook = ReturnType<typeof createPageSizes>;

export { createPageSizes };
export type { PageSizesHook };
