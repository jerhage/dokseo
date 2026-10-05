import {
  dockDetentAfterKey,
  dockDetentHeight,
  dockDetentToggled,
  dockSheetHeight,
  dockSheetSettle,
} from './dock';
import type { DockDetent, DockSheetHeights } from './dock';
import { TOUCH_SLOP_PX } from './gesture';

type DockPointer = { readonly id: number; readonly y: number; readonly t: number };

type DockSheetDrag = {
  readonly press: DockPointer;
  readonly from: number;
  readonly height: number;
  readonly moved: boolean;
};

class DockSheet {
  detent = $state<DockDetent>('standard');
  heights = $state<Record<DockDetent, number>>({ standard: 0, tall: 0 });
  #drag = $state<DockSheetDrag | null>(null);
  #dragged = false;
  readonly #onclose: () => void;

  constructor(onclose: () => void) {
    this.#onclose = onclose;
  }

  get dragging(): boolean {
    return this.#drag !== null;
  }

  get height(): string {
    const drag = this.#drag;
    return drag === null ? dockDetentHeight(this.detent) : `${drag.height}px`;
  }

  #measured(): DockSheetHeights {
    return { standard: this.heights.standard, tall: this.heights.tall };
  }

  press(pointer: DockPointer, from: number): boolean {
    if (this.#drag !== null) return false;

    this.#dragged = false;
    this.#drag = { press: pointer, from, height: from, moved: false };
    return true;
  }

  follow(pointer: DockPointer): void {
    const drag = this.#drag;
    if (drag === null || drag.press.id !== pointer.id) return;

    const travel = pointer.y - drag.press.y;
    this.#drag = {
      ...drag,
      height: dockSheetHeight(drag.from, travel, this.#measured()),
      moved: drag.moved || Math.abs(travel) >= TOUCH_SLOP_PX,
    };
  }

  release(pointer: DockPointer): void {
    const drag = this.#drag;
    if (drag === null || drag.press.id !== pointer.id) return;

    const travel = pointer.y - drag.press.y;
    const moved = drag.moved || Math.abs(travel) >= TOUCH_SLOP_PX;
    this.#drag = null;
    this.#dragged = moved;
    if (!moved) return;

    const heights = this.#measured();
    const settle = dockSheetSettle(
      dockSheetHeight(drag.from, travel, heights),
      travel,
      pointer.t - drag.press.t,
      heights,
      this.detent,
    );
    if (settle.kind === 'detent') {
      this.detent = settle.detent;
      return;
    }

    this.detent = 'standard';
    this.#onclose();
  }

  cancel(id: number): void {
    if (this.#drag?.press.id === id) this.#drag = null;
  }

  activate(byKeyboard: boolean): void {
    const dragged = this.#dragged;
    this.#dragged = false;
    if (dragged && !byKeyboard) return;

    this.detent = dockDetentToggled(this.detent);
  }

  key(key: string): boolean {
    const next = dockDetentAfterKey(this.detent, key);
    if (next === null) return false;

    this.detent = next;
    return true;
  }
}

export { DockSheet };
export type { DockPointer };
