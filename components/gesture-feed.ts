import { GESTURE_IDLE, gestureDeadline, gestureStep } from './gesture';
import type {
  GestureContext,
  GestureInput,
  GestureSample,
  GestureState,
  GestureStep,
  GestureTick,
} from './gesture';
import { SYSTEM_CLOCK } from './clock';
import type { Clock } from './clock';

type GesturePointer = {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
};

class GestureFeed {
  #clock: Clock;
  #ontick: (tick: GestureTick) => void;
  #state: GestureState = GESTURE_IDLE;
  #cancel: (() => void) | null = null;

  constructor(ontick: (tick: GestureTick) => void, clock: Clock = SYSTEM_CLOCK) {
    this.#clock = clock;
    this.#ontick = ontick;
  }

  get state(): GestureState {
    return this.#state;
  }

  sample(kind: GestureSample['kind'], pointer: GesturePointer): GestureSample {
    return {
      kind,
      id: pointer.pointerId,
      type: pointer.pointerType,
      x: pointer.clientX,
      y: pointer.clientY,
      t: this.#clock.now(),
    };
  }

  step(input: GestureInput, context: GestureContext): GestureStep {
    const step = gestureStep(this.#state, input, context);
    this.#state = step.state;
    this.#arm();
    return step;
  }

  stop(): void {
    this.#cancel?.();
    this.#cancel = null;
  }

  #arm(): void {
    this.stop();
    const deadline = gestureDeadline(this.#state);
    if (deadline === null) return;

    this.#cancel = this.#clock.schedule(
      () => {
        this.#cancel = null;
        this.#ontick({ kind: 'tick', t: this.#clock.now() });
      },
      Math.max(0, deadline - this.#clock.now()),
    );
  }
}

export { GestureFeed };
export type { GesturePointer };
