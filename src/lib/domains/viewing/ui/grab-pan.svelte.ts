import { grabPress } from './grab-press';
import type { GrabPress, MousePress } from './grab-press';

type Grab = {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly bySpace: boolean;
};

type GrabPointer = {
  readonly pointerId: number;
  readonly clientX: number;
  readonly clientY: number;
};

type PointerCapture = {
  hasPointerCapture(pointerId: number): boolean;
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
};

type GrabStep = {
  readonly dx: number;
  readonly dy: number;
  readonly bySpace: boolean;
};

function createGrabPan(surface: () => PointerCapture | null) {
  let grab = $state.raw<Grab | null>(null);
  let spaceHeld = $state(false);

  function stop(): void {
    const moving = grab;
    if (moving === null) return;

    const held = surface();
    if (held !== null && held.hasPointerCapture(moving.id)) {
      held.releasePointerCapture(moving.id);
    }
    grab = null;
  }

  return {
    get spaceHeld(): boolean {
      return spaceHeld;
    },
    get grabbing(): boolean {
      return grab !== null;
    },
    grabbable(selecting: () => boolean): boolean {
      return spaceHeld && grab === null && !selecting();
    },
    press(press: MousePress): GrabPress {
      return grabPress(press, spaceHeld);
    },
    owns(pointerId: number): boolean {
      return grab !== null && grab.id === pointerId;
    },
    start(target: PointerCapture, pointer: GrabPointer, bySpace: boolean): void {
      grab = { id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY, bySpace };
      target.setPointerCapture(pointer.pointerId);
    },
    move(pointer: GrabPointer): GrabStep | null {
      const moving = grab;
      if (moving === null || moving.id !== pointer.pointerId) return null;

      grab = {
        id: moving.id,
        x: pointer.clientX,
        y: pointer.clientY,
        bySpace: moving.bySpace,
      };
      return {
        dx: pointer.clientX - moving.x,
        dy: pointer.clientY - moving.y,
        bySpace: moving.bySpace,
      };
    },
    stop,
    holdSpace(): void {
      spaceHeld = true;
    },
    dropSpace(): void {
      spaceHeld = false;
      if (grab !== null && grab.bySpace) stop();
    },
  };
}

export { createGrabPan };
export type { GrabPointer, GrabStep, PointerCapture };
