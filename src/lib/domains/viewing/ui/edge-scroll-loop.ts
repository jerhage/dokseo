import { edgeScrollBy, edgeSpeed } from './edge-scroll';
import type { EdgeBand } from './edge-scroll';

type EdgeSurface = {
  scrollTop: number;
  getBoundingClientRect(): EdgeBand;
};

type EdgeTarget = {
  readonly surface: () => EdgeSurface | null;
  readonly dragging: () => boolean;
};

type FrameClock = {
  readonly request: (step: (now: number) => void) => number;
  readonly cancel: (frame: number) => void;
};

const ANIMATION_FRAMES: FrameClock = {
  request: (step) => requestAnimationFrame(step),
  cancel: (frame) => cancelAnimationFrame(frame),
};

class EdgeScroll {
  #target: EdgeTarget;
  #clock: FrameClock;
  #pointerY: number | null = null;
  #frame: number | null = null;
  #lastFrame: number | null = null;

  constructor(target: EdgeTarget, clock: FrameClock = ANIMATION_FRAMES) {
    this.#target = target;
    this.#clock = clock;
  }

  get running(): boolean {
    return this.#frame !== null;
  }

  follow(pointerY: number): void {
    if (!this.#target.dragging()) {
      this.stop();
      return;
    }

    this.#pointerY = pointerY;
    if (this.#frame === null) this.#frame = this.#clock.request((now) => this.#step(now));
  }

  stop(): void {
    if (this.#frame !== null) this.#clock.cancel(this.#frame);
    this.#frame = null;
    this.#lastFrame = null;
    this.#pointerY = null;
  }

  #step(now: number): void {
    this.#frame = null;
    const surface = this.#target.surface();
    const pointerY = this.#pointerY;
    if (surface === null || pointerY === null || !this.#target.dragging()) {
      this.stop();
      return;
    }

    const box = surface.getBoundingClientRect();
    const speed = edgeSpeed(pointerY, { top: box.top, bottom: box.bottom });
    if (speed === 0) {
      this.stop();
      return;
    }

    const last = this.#lastFrame;
    this.#lastFrame = now;
    if (last !== null) surface.scrollTop += edgeScrollBy(speed, now - last);
    this.#frame = this.#clock.request((next) => this.#step(next));
  }
}

export { ANIMATION_FRAMES, EdgeScroll };
export type { EdgeSurface, EdgeTarget, FrameClock };
