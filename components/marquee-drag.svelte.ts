import { match } from 'ts-pattern';
import {
  NOT_SCROLLED,
  anchorOnScreen,
  anchoredRect,
  endsInClick,
  marqueeBox,
  marqueeEnd,
  marqueePress,
  scrolledFurther,
  stayedPut,
} from './marquee-selection';
import type {
  MarqueeBox,
  MarqueeEnd,
  MarqueePoint,
  MarqueePointers,
  MarqueePress,
  MarqueeRect,
  MarqueeRefusal,
  MarqueeStroke,
} from './marquee-selection';

type Watch = {
  readonly id: number;
  readonly from: MarqueePoint;
  readonly strayed: boolean;
};

type MarqueeContact = {
  readonly id: number;
  readonly at: MarqueePoint;
  readonly primary: boolean;
  readonly button: number;
  readonly pointerType: string;
  readonly onContent: boolean;
};

type MarqueeDragHost = {
  readonly surface: () => HTMLElement | null;
  readonly release: (id: number) => void;
  readonly pointerTypes: () => MarqueePointers;
  readonly slop: (pointerType: string) => number;
  readonly minimum: () => number;
  readonly suppressed: () => boolean;
  readonly onstart: () => void;
  readonly ondraw: (selection: MarqueeRect) => void;
  readonly onend: (end: MarqueeEnd, stroke: MarqueeStroke) => void;
  readonly onrefuse: (refusal: MarqueeRefusal) => void;
  readonly onclick: (at: MarqueePoint) => void;
  readonly ondismiss: () => void;
};

const DRIVEN_POINTER = 'touch';

class MarqueeDrag {
  #host: MarqueeDragHost;
  #corner = $state.raw<MarqueePoint | null>(null);
  #anchor = $state.raw<MarqueePoint | null>(null);
  #pointer = $state.raw<MarqueePoint | null>(null);
  #travelled = $state.raw<MarqueePoint>(NOT_SCROLLED);
  #held = $state<number | null>(null);
  #kept = $state.raw<MarqueeRect | null>(null);
  #watch = $state.raw<Watch | null>(null);

  readonly #box = $derived.by(() => {
    const from = this.#anchor;
    const to = this.#pointer;
    const origin = this.#corner;
    if (from === null || to === null || origin === null) return null;

    return marqueeBox(anchorOnScreen(from, this.#travelled), to, origin);
  });

  constructor(host: MarqueeDragHost) {
    this.#host = host;
  }

  get box(): MarqueeBox | null {
    return this.#box;
  }

  get dragging(): boolean {
    return this.#held !== null;
  }

  #drawTo(from: MarqueePoint, to: MarqueePoint): void {
    this.#pointer = to;
    this.#host.ondraw(anchoredRect(from, this.#travelled, to));
  }

  #stopDrag(): void {
    const id = this.#held;
    if (id !== null) this.#host.release(id);
    this.#held = null;
    this.#anchor = null;
    this.#pointer = null;
  }

  #begin(corner: MarqueePoint, id: number, from: MarqueePoint, to: MarqueePoint): void {
    this.#corner = corner;
    this.#anchor = from;
    this.#travelled = NOT_SCROLLED;
    this.#held = id;
    this.#kept = null;
    this.#host.onstart();
    this.#drawTo(from, to);
  }

  #conclude(released: number, to: MarqueePoint, pointerType: string, clicks: boolean): void {
    const id = this.#held;
    if (id === null) return;
    if (id !== released) {
      this.#host.onrefuse({ kind: 'pointer-mismatch', held: id, released });
      return;
    }

    const surface = this.#host.surface();
    const from = this.#anchor === null ? null : anchorOnScreen(this.#anchor, this.#travelled);
    this.#stopDrag();
    if (surface === null || from === null) {
      this.#host.onrefuse({
        kind: 'no-drag-origin',
        hasSurface: surface !== null,
        hasAnchor: from !== null,
      });
      return;
    }

    const end = marqueeEnd(from, to, this.#host.slop(pointerType), this.#host.minimum());
    this.#host.onend(end, { from, to, surface });
    if (clicks && endsInClick(end)) this.#host.onclick(to);
  }

  followScroll(by: MarqueePoint): void {
    const from = this.#anchor;
    const to = this.#pointer;
    if (this.#held === null || from === null) return;

    this.#travelled = scrolledFurther(this.#travelled, by);
    if (to !== null) this.#drawTo(from, to);
  }

  keep(selection: MarqueeRect): void {
    this.#kept = selection;
  }

  reset(): void {
    this.#watch = null;
    if (this.#anchor === null && this.#kept === null) return;
    this.#stopDrag();
    this.#kept = null;
  }

  dismiss(): void {
    this.#watch = null;
    if (this.#anchor === null && this.#kept === null) return;
    this.#stopDrag();
    this.#kept = null;
    this.#host.ondismiss();
  }

  unwatch(): void {
    this.#watch = null;
  }

  press(contact: MarqueeContact, corner: () => MarqueePoint): MarqueePress {
    const press = marqueePress(
      {
        ready: !this.#host.suppressed(),
        primary: contact.primary,
        button: contact.button,
        onContent: contact.onContent,
        pointerType: contact.pointerType,
      },
      this.#host.pointerTypes(),
    );
    match(press)
      .with({ kind: 'ignored' }, () => undefined)
      .with({ kind: 'watched' }, () => {
        this.#watch = { id: contact.id, from: contact.at, strayed: false };
      })
      .with({ kind: 'drawn' }, () => {
        this.#begin(corner(), contact.id, contact.at, contact.at);
      })
      .exhaustive();
    return press;
  }

  move(id: number, at: MarqueePoint): void {
    const watching = this.#watch;
    if (watching !== null && watching.id === id) {
      if (!watching.strayed && !stayedPut(watching.from, at, this.#host.minimum())) {
        this.#watch = { ...watching, strayed: true };
      }
      return;
    }

    const from = this.#anchor;
    if (this.#held !== id || from === null) return;
    this.#drawTo(from, at);
  }

  lift(id: number, at: MarqueePoint, pointerType: string): void {
    const watching = this.#watch;
    if (watching !== null && watching.id === id) {
      this.#watch = null;
      if (!watching.strayed && stayedPut(watching.from, at, this.#host.minimum())) {
        this.#host.onclick(at);
      }
      return;
    }

    this.#conclude(id, at, pointerType, true);
  }

  cancel(id: number): void {
    if (this.#watch !== null && this.#watch.id === id) {
      this.#watch = null;
      return;
    }

    if (this.#held !== id) return;
    this.#stopDrag();
  }

  beginAt(id: number, from: MarqueePoint, to: MarqueePoint, corner: () => MarqueePoint): void {
    if (this.#host.suppressed()) return;

    this.#begin(corner(), id, from, to);
  }

  extendTo(at: MarqueePoint): void {
    const from = this.#anchor;
    if (this.#held === null || from === null) return;
    this.#drawTo(from, at);
  }

  endAt(at: MarqueePoint): void {
    const id = this.#held;
    if (id === null) return;

    this.#conclude(id, at, DRIVEN_POINTER, false);
  }

  abandon(): void {
    if (this.#held === null) return;
    this.#stopDrag();
  }
}

export { MarqueeDrag };
export type { MarqueeContact, MarqueeDragHost };
