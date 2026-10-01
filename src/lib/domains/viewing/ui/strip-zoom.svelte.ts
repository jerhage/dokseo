import { clampZoom, pinchZoom } from '$lib/components/pan-zoom';
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

class StripZoom {
  #source: () => StripSource;
  #zoom = $state(FIT_WIDTH_ZOOM);
  #hold: StripHold;
  #reading = $state.raw<StripAnchor | null>(null);

  #width = $derived.by<number>(() => this.#source().frameWidth * this.#zoom);
  #layout = $derived.by<readonly SliceLayout[]>(() =>
    layOutStrip(this.#source().sizes, this.#width),
  );

  constructor(source: () => StripSource, start: ReadingPosition) {
    this.#source = source;
    this.#hold = $state.raw({ position: start, top: 0, across: 0, left: 0 });
  }

  get zoom(): number {
    return this.#zoom;
  }

  get width(): number {
    return this.#width;
  }

  get layout(): readonly SliceLayout[] {
    return this.#layout;
  }

  get hold(): StripHold {
    return this.#hold;
  }

  get reading(): StripAnchor | null {
    return this.#reading;
  }

  get atFitWidth(): boolean {
    return this.#zoom === FIT_WIDTH_ZOOM;
  }

  get toFitWidth(): number {
    return FIT_WIDTH_ZOOM / this.#zoom;
  }

  get target(): StripScroll {
    return scrollForHold(this.#layout, this.#width, this.#hold);
  }

  zoomBy(factor: number, scroll: StripScroll, at: Point): void {
    const next = clampZoom(this.#zoom * factor);
    if (next === this.#zoom) return;

    this.#reading = null;
    this.#hold = heldAround(this.#layout, this.#width, this.#hold, scroll, at, at);
    this.#zoom = next;
  }

  pinch(scale: number, scroll: StripScroll, was: Point, now: Point): boolean {
    this.#reading = null;
    this.#hold = heldAround(this.#layout, this.#width, this.#hold, scroll, was, now);

    const next = pinchZoom(this.#zoom, scale, FIT_WIDTH_ZOOM);
    if (next === this.#zoom) return false;

    this.#zoom = next;
    return true;
  }

  settleAt(scroll: StripScroll): void {
    this.#hold = heldAtScroll(this.#layout, this.#width, this.#hold, scroll);
    this.follow();
  }

  follow(): void {
    this.#reading = anchorOf(this.#layout, this.#width, this.#hold.position.index);
  }

  goTo(asked: ReadingPosition): boolean {
    if (asked.index === this.#hold.position.index) return false;

    this.#reading = null;
    this.#hold = heldAt(this.#hold, asked);
    return true;
  }
}

export { FIT_WIDTH_ZOOM, StripZoom };
export type { StripSource };
