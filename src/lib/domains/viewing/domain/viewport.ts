import { match } from 'ts-pattern';
import { centrePan, fitZoom } from '$lib/components/pan-zoom';
import type { Viewport } from '$lib/components/pan-zoom';
import type { Size } from '$lib/shared/geometry';
import type { PageFit } from '$lib/shared/page-fit';

type ViewportFit = PageFit | 'free';

type Framing = { readonly content: Size; readonly frame: Size };

const FIT_HEIGHT_ZOOM = 1;

function arrivalViewport(fit: ViewportFit, from: Viewport, framing: Framing | null): Viewport {
  if (framing === null) return from;

  const zoom = match(fit)
    .with('height', () => FIT_HEIGHT_ZOOM)
    .with('width', () => fitZoom(framing.content, framing.frame, 'width'))
    .with('free', () => from.zoom)
    .exhaustive();

  return centrePan({ zoom, panX: from.panX, panY: from.panY }, framing.content, framing.frame);
}

export { FIT_HEIGHT_ZOOM, arrivalViewport };
export type { Framing, ViewportFit };
