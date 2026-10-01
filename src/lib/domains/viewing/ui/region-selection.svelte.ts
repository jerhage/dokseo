import type { ImageRegion } from '$lib/shared/image-region';

class RegionSelection {
  regions = $state.raw<readonly ImageRegion[]>([]);

  select(regions: readonly ImageRegion[]): void {
    this.regions = regions;
  }

  clear(): void {
    if (this.regions.length > 0) this.regions = [];
  }
}

export { RegionSelection };
