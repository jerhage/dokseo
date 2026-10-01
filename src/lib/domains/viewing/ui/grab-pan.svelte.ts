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

type MousePress = {
  readonly button: number;
  readonly isPrimary: boolean;
};

type GrabPress =
  | { readonly kind: 'grab'; readonly bySpace: boolean }
  | { readonly kind: 'select' }
  | { readonly kind: 'ignore' };

type GrabStep = {
  readonly dx: number;
  readonly dy: number;
  readonly bySpace: boolean;
};

const MIDDLE_BUTTON = 1;

const MAIN_BUTTON = 0;

function grabPress(press: MousePress, spaceHeld: boolean): GrabPress {
  if (press.button === MIDDLE_BUTTON) return { kind: 'grab', bySpace: false };
  if (!press.isPrimary || press.button !== MAIN_BUTTON) return { kind: 'ignore' };
  if (spaceHeld) return { kind: 'grab', bySpace: true };
  return { kind: 'select' };
}

class GrabPan {
  #surface: () => PointerCapture | null;
  #grab = $state.raw<Grab | null>(null);
  #spaceHeld = $state(false);

  constructor(surface: () => PointerCapture | null) {
    this.#surface = surface;
  }

  get spaceHeld(): boolean {
    return this.#spaceHeld;
  }

  get grabbing(): boolean {
    return this.#grab !== null;
  }

  grabbable(selecting: () => boolean): boolean {
    return this.#spaceHeld && this.#grab === null && !selecting();
  }

  press(press: MousePress): GrabPress {
    return grabPress(press, this.#spaceHeld);
  }

  owns(pointerId: number): boolean {
    return this.#grab !== null && this.#grab.id === pointerId;
  }

  start(target: PointerCapture, pointer: GrabPointer, bySpace: boolean): void {
    this.#grab = { id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY, bySpace };
    target.setPointerCapture(pointer.pointerId);
  }

  move(pointer: GrabPointer): GrabStep | null {
    const moving = this.#grab;
    if (moving === null || moving.id !== pointer.pointerId) return null;

    this.#grab = {
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
  }

  stop(): void {
    const moving = this.#grab;
    if (moving === null) return;

    const surface = this.#surface();
    if (surface !== null && surface.hasPointerCapture(moving.id)) {
      surface.releasePointerCapture(moving.id);
    }
    this.#grab = null;
  }

  holdSpace(): void {
    this.#spaceHeld = true;
  }

  dropSpace(): void {
    this.#spaceHeld = false;
    if (this.#grab !== null && this.#grab.bySpace) this.stop();
  }
}

export { GrabPan, grabPress };
export type { GrabPointer, GrabPress, GrabStep, MousePress, PointerCapture };
