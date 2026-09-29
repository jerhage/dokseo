import { glowRegions } from '$lib/shared/image-region';
import type { GlowRegion } from '$lib/shared/image-region';
import type { Arrival, ArrivalCapture } from '../../domain/capture/capture-arrival';

const NOTHING_TO_GLOW: readonly GlowRegion[] = [];

function glowOf(capture: ArrivalCapture): readonly GlowRegion[] {
  if (capture.anchor.kind === 'text') return NOTHING_TO_GLOW;

  return glowRegions(capture.anchor.regions, capture.origin);
}

function arrivalGlow(arrival: Arrival<ArrivalCapture> | null): readonly GlowRegion[] {
  return arrival === null ? NOTHING_TO_GLOW : glowOf(arrival.at);
}

export { arrivalGlow };
