import type { ImageIndex } from '$lib/shared/ids';
import type { GlowRegion } from '$lib/shared/image-region';

const READING_MARKER = 'FROM CAPTURE';

const NOTE_MARKER = 'NOTE';

function glowOn(glow: readonly GlowRegion[], index: ImageIndex): readonly GlowRegion[] {
  return glow.filter((region) => region.index === index);
}

function glowMarker(glow: readonly GlowRegion[]): string | null {
  const first = glow[0];
  if (first === undefined) return null;

  return first.origin === 'written' ? NOTE_MARKER : READING_MARKER;
}

export { NOTE_MARKER, READING_MARKER, glowMarker, glowOn };
