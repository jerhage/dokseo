import { match } from 'ts-pattern';
import { ANIMATION_FRAMES } from '$lib/shared/frame-clock';
import type { FrameClock } from '$lib/shared/frame-clock';
import { liftSpot, offerMove } from './flow-lift';
import type { LiftMetrics, LiftRect, StageRect } from './flow-lift';
import type { Point } from './flow-turn';

type OfferedLift<C> = {
  readonly chapter: C;
  readonly left: number;
  readonly top: number;
};

type LiftStage = {
  readonly box: () => StageRect;
  readonly metrics: () => LiftMetrics;
};

type LiftSight<C> = {
  readonly stage: () => LiftStage | null;
  readonly selection: (chapter: C) => readonly LiftRect[];
  readonly origin: (chapter: C) => Point;
};

class LiftOffer<C> {
  #sight: LiftSight<C>;
  #clock: FrameClock;
  #offer = $state.raw<OfferedLift<C> | null>(null);
  #showing: C | null = null;
  #pointerHeld = false;
  #queued: number | null = null;

  constructor(sight: LiftSight<C>, clock: FrameClock = ANIMATION_FRAMES) {
    this.#sight = sight;
    this.#clock = clock;
  }

  get offer(): OfferedLift<C> | null {
    return this.#offer;
  }

  show(chapter: C): void {
    this.#showing = chapter;
  }

  press(): void {
    this.#offer = null;
    this.#pointerHeld = true;
  }

  release(): void {
    this.#pointerHeld = false;
    this.ask();
  }

  ask(): void {
    if (this.#queued !== null) return;

    this.#queued = this.#clock.request(() => {
      this.#queued = null;
      this.#follow();
    });
  }

  dismiss(): boolean {
    if (this.#offer === null) return false;

    this.#offer = null;
    return true;
  }

  take(): OfferedLift<C> | null {
    const held = this.#offer;
    this.#offer = null;
    return held;
  }

  close(): void {
    if (this.#queued !== null) this.#clock.cancel(this.#queued);
    this.#queued = null;
    this.#showing = null;
    this.#pointerHeld = false;
    this.#offer = null;
  }

  #follow(): void {
    const stage = this.#sight.stage();
    const chapter = this.#showing;
    if (stage === null || chapter === null) {
      this.#offer = null;
      return;
    }

    const rects = this.#sight.selection(chapter);
    match(offerMove({ selected: rects.length > 0, pointerHeld: this.#pointerHeld }))
      .with({ kind: 'keep' }, () => undefined)
      .with({ kind: 'clear' }, () => {
        this.#offer = null;
      })
      .with({ kind: 'place' }, () => {
        this.#offer = this.#placed(stage, chapter, rects);
      })
      .exhaustive();
  }

  #placed(stage: LiftStage, chapter: C, rects: readonly LiftRect[]): OfferedLift<C> | null {
    const box = stage.box();
    const origin = this.#sight.origin(chapter);
    const spot = liftSpot(rects, origin, box, stage.metrics());
    return spot === null ? null : { chapter, ...spot };
  }
}

export { LiftOffer };
export type { LiftSight, LiftStage, OfferedLift };
