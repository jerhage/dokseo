import type { CaptureOrigin } from './capture-origin';
import type { PageRect } from './geometry';
import type { ImageIndex } from './ids';

type ImageRegion = { readonly index: ImageIndex; readonly rect: PageRect };

type GlowRegion = ImageRegion & { readonly origin: CaptureOrigin };

function glowRegions(
  regions: readonly ImageRegion[],
  origin: CaptureOrigin,
): readonly GlowRegion[] {
  return regions.map((region) => ({ ...region, origin }));
}

export { glowRegions };
export type { ImageRegion, GlowRegion };
