import { match } from 'ts-pattern';
import type { TouchTurns } from '$lib/shared/page-turn';
import { keyMove, pointerEnded, releaseAction, turnPage } from './flow-turn';
import type { FlowAction, FlowMove, KeyPress, PageTurner, Point } from './flow-turn';

type Press = {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly at: Point;
};

type Release = {
  readonly pointerId: number;
  readonly at: Point;
  readonly width: number;
  readonly textSelected: boolean;
  readonly turns: TouchTurns;
  readonly edgeClicksTurn: boolean;
  readonly chromeShown: boolean;
};

const DID_NOTHING: FlowAction = { kind: 'nothing' };

const TOUCH_POINTER = 'touch';

class FlowGestures {
  #pages: PageTurner;
  #press: Press | null = null;
  #touchTurned = false;

  constructor(pages: PageTurner) {
    this.#pages = pages;
  }

  pressed(press: Press): void {
    this.#press = press;
    this.#touchTurned = false;
  }

  released(release: Release): FlowAction {
    const began = this.#press;
    this.#press = null;
    if (began === null || began.pointerId !== release.pointerId) return DID_NOTHING;

    const action = releaseAction(
      pointerEnded({
        from: began.at,
        to: release.at,
        pointerType: began.pointerType,
        width: release.width,
        textSelected: release.textSelected,
        turns: release.turns,
        edgeClicksTurn: release.edgeClicksTurn,
        chromeShown: release.chromeShown,
      }),
    );

    match(action)
      .with({ kind: 'nothing' }, () => undefined)
      .with({ kind: 'chrome' }, () => undefined)
      .with({ kind: 'turn' }, (turning) => {
        this.#touchTurned = began.pointerType === TOUCH_POINTER;
        turnPage(this.#pages, turning.move);
      })
      .exhaustive();

    return action;
  }

  cancelled(pointerId: number): void {
    if (this.#press?.pointerId !== pointerId) return;

    this.#press = null;
  }

  claimsTouchEnd(): boolean {
    const claimed = this.#touchTurned;
    this.#touchTurned = false;
    return claimed;
  }

  keyed(press: KeyPress): FlowMove {
    const move = keyMove(press);
    turnPage(this.#pages, move);

    return move;
  }
}

export { FlowGestures };
export type { Press, Release };
