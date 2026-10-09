import type { ImageRegion } from '$lib/shared/image-region';

function createRegionSelection() {
  let regions = $state.raw<readonly ImageRegion[]>([]);

  return {
    get regions(): readonly ImageRegion[] {
      return regions;
    },
    select(next: readonly ImageRegion[]): void {
      regions = next;
    },
    clear(): void {
      if (regions.length > 0) regions = [];
    },
  };
}

type RegionSelectionHook = ReturnType<typeof createRegionSelection>;

export { createRegionSelection };
export type { RegionSelectionHook };
