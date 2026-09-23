import { match } from 'ts-pattern';
import type { CaptureOrigin } from '$lib/shared/capture-origin';
import type { ImageIndex } from '$lib/shared/ids';
import type { GlowRegion } from '$lib/shared/image-region';

const READING_MARKER = 'FROM CAPTURE';

const NOTE_MARKER = 'NOTE';

const LIFTED_MARKER = 'LIFTED';

function glowOn(glow: readonly GlowRegion[], index: ImageIndex): readonly GlowRegion[] {
  return glow.filter((region) => region.index === index);
}

function markerFor(origin: CaptureOrigin): string {
  return match(origin)
    .with('written', () => NOTE_MARKER)
    .with('recognized', () => READING_MARKER)
    .with('lifted', () => LIFTED_MARKER)
    .exhaustive();
}

function glowMarker(glow: readonly GlowRegion[]): string | null {
  const first = glow[0];
  if (first === undefined) return null;

  return markerFor(first.origin);
}

export { LIFTED_MARKER, NOTE_MARKER, READING_MARKER, glowMarker, glowOn };
