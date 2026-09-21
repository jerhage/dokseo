import type { ImageIndex } from '$lib/shared/ids';
import type { GlowRegion } from '$lib/shared/image-region';

function glowOn(glow: readonly GlowRegion[], index: ImageIndex): readonly GlowRegion[] {
  return glow.filter((region) => region.index === index);
}

export { glowOn };
