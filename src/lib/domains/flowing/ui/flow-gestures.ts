import { keyMove, moveForEnd, pointerEnded, turnPage } from './flow-turn';
import type { FlowMove, KeyPress, PageTurner, Point } from './flow-turn';

type Press = {
  readonly pointerId: number;
  readonly at: Point;
};

type Release = {
  readonly pointerId: number;
  readonly at: Point;
  readonly width: number;
  readonly textSelected: boolean;
};

const STAYED: FlowMove = { kind: 'stay' };

class FlowGestures {
  #pages: PageTurner;
  #press: Press | null = null;

  constructor(pages: PageTurner) {
    this.#pages = pages;
  }

  pressed(press: Press): void {
    this.#press = press;
  }

  released(release: Release): FlowMove {
    const began = this.#press;
    this.#press = null;
    if (began === null || began.pointerId !== release.pointerId) return STAYED;

    const move = moveForEnd(
      pointerEnded({
        from: began.at,
        to: release.at,
        width: release.width,
        textSelected: release.textSelected,
      }),
    );
    turnPage(this.#pages, move);

    return move;
  }

  cancelled(pointerId: number): void {
    if (this.#press?.pointerId === pointerId) this.#press = null;
  }

  keyed(press: KeyPress): FlowMove {
    const move = keyMove(press);
    turnPage(this.#pages, move);

    return move;
  }
}

export { FlowGestures };
export type { Press, Release };
