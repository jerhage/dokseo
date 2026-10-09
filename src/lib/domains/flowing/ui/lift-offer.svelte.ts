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

function createLiftOffer<C>(sight: LiftSight<C>, clock: FrameClock = ANIMATION_FRAMES) {
  let offer = $state.raw<OfferedLift<C> | null>(null);
  let showing: C | null = null;
  let pointerHeld = false;
  let queued: number | null = null;

  function placed(stage: LiftStage, chapter: C, rects: readonly LiftRect[]): OfferedLift<C> | null {
    const box = stage.box();
    const origin = sight.origin(chapter);
    const spot = liftSpot(rects, origin, box, stage.metrics());
    return spot === null ? null : { chapter, ...spot };
  }

  function follow(): void {
    const stage = sight.stage();
    const chapter = showing;
    if (stage === null || chapter === null) {
      offer = null;
      return;
    }

    const rects = sight.selection(chapter);
    match(offerMove({ selected: rects.length > 0, pointerHeld }))
      .with({ kind: 'keep' }, () => undefined)
      .with({ kind: 'clear' }, () => {
        offer = null;
      })
      .with({ kind: 'place' }, () => {
        offer = placed(stage, chapter, rects);
      })
      .exhaustive();
  }

  function ask(): void {
    if (queued !== null) return;

    queued = clock.request(() => {
      queued = null;
      follow();
    });
  }

  return {
    get offer(): OfferedLift<C> | null {
      return offer;
    },
    show(chapter: C): void {
      showing = chapter;
    },
    press(): void {
      offer = null;
      pointerHeld = true;
    },
    release(): void {
      pointerHeld = false;
      ask();
    },
    ask,
    dismiss(): boolean {
      if (offer === null) return false;

      offer = null;
      return true;
    },
    take(): OfferedLift<C> | null {
      const held = offer;
      offer = null;
      return held;
    },
    close(): void {
      if (queued !== null) clock.cancel(queued);
      queued = null;
      showing = null;
      pointerHeld = false;
      offer = null;
    },
  };
}

export { createLiftOffer };
export type { LiftSight, LiftStage, OfferedLift };
