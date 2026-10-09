import { clampZoom, pinchZoom } from '$lib/ui/components/pan-zoom';
import type { Size } from '$lib/shared/geometry';
import type { ReadingPosition } from '../domain/reading-position';
import type { Point } from '../domain/selection';
import { anchorOf, layOutStrip } from '../domain/strip';
import type { SliceLayout, StripAnchor } from '../domain/strip';
import { heldAround, heldAt, heldAtScroll, scrollForHold } from './strip-hold';
import type { StripHold, StripScroll } from './strip-hold';

type StripSource = {
  readonly sizes: readonly (Size | null)[];
  readonly frameWidth: number;
};

const FIT_WIDTH_ZOOM = 1;

function createStripZoom(source: () => StripSource, start: ReadingPosition) {
  let zoom = $state(FIT_WIDTH_ZOOM);
  let hold = $state.raw<StripHold>({ position: start, top: 0, across: 0, left: 0 });
  let reading = $state.raw<StripAnchor | null>(null);

  const width = $derived.by<number>(() => source().frameWidth * zoom);
  const layout = $derived.by<readonly SliceLayout[]>(() => layOutStrip(source().sizes, width));

  function follow(): void {
    reading = anchorOf(layout, width, hold.position.index);
  }

  return {
    get zoom(): number {
      return zoom;
    },
    get width(): number {
      return width;
    },
    get layout(): readonly SliceLayout[] {
      return layout;
    },
    get hold(): StripHold {
      return hold;
    },
    get reading(): StripAnchor | null {
      return reading;
    },
    get atFitWidth(): boolean {
      return zoom === FIT_WIDTH_ZOOM;
    },
    get toFitWidth(): number {
      return FIT_WIDTH_ZOOM / zoom;
    },
    get target(): StripScroll {
      return scrollForHold(layout, width, hold);
    },
    zoomBy(factor: number, scroll: StripScroll, at: Point): void {
      const next = clampZoom(zoom * factor);
      if (next === zoom) return;

      reading = null;
      hold = heldAround(layout, width, hold, scroll, at, at);
      zoom = next;
    },
    pinch(scale: number, scroll: StripScroll, was: Point, now: Point): boolean {
      reading = null;
      hold = heldAround(layout, width, hold, scroll, was, now);

      const next = pinchZoom(zoom, scale, FIT_WIDTH_ZOOM);
      if (next === zoom) return false;

      zoom = next;
      return true;
    },
    settleAt(scroll: StripScroll): void {
      hold = heldAtScroll(layout, width, hold, scroll);
      follow();
    },
    follow,
    goTo(asked: ReadingPosition): boolean {
      if (asked.index === hold.position.index) return false;

      reading = null;
      hold = heldAt(hold, asked);
      return true;
    },
  };
}

export { FIT_WIDTH_ZOOM, createStripZoom };
export type { StripSource };
