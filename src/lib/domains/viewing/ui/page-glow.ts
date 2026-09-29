import type { ImageIndex } from '$lib/shared/ids';
import type { GlowRegion } from '$lib/shared/image-region';

function glowOn(glow: readonly GlowRegion[], index: ImageIndex): readonly GlowRegion[] {
  return glow.filter((region) => region.index === index);
}

function shownGlow(
  named: readonly GlowRegion[],
  others: readonly GlowRegion[],
  all: boolean,
): readonly GlowRegion[] {
  return all && others.length > 0 ? [...named, ...others] : named;
}

export { glowOn, shownGlow };
