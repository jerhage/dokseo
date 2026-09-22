import { match } from 'ts-pattern';
import { keyMove, pointerEnded, releaseAction, turnPage } from './flow-turn';
import type { FlowAction, FlowMove, KeyPress, PageTurner, Point } from './flow-turn';

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

const DID_NOTHING: FlowAction = { kind: 'nothing' };

class FlowGestures {
  #pages: PageTurner;
  #press: Press | null = null;

  constructor(pages: PageTurner) {
    this.#pages = pages;
  }

  pressed(press: Press): void {
    this.#press = press;
  }

  released(release: Release): FlowAction {
    const began = this.#press;
    this.#press = null;
    if (began === null || began.pointerId !== release.pointerId) return DID_NOTHING;

    const action = releaseAction(
      pointerEnded({
        from: began.at,
        to: release.at,
        width: release.width,
        textSelected: release.textSelected,
      }),
    );

    match(action)
      .with({ kind: 'nothing' }, () => undefined)
      .with({ kind: 'chrome' }, () => undefined)
      .with({ kind: 'turn' }, (turning) => {
        turnPage(this.#pages, turning.move);
      })
      .exhaustive();

    return action;
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
