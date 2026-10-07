import type { SoughtPassage, TextQuote } from '$lib/shared/anchor';
import type { BookId } from '$lib/shared/ids';
import {
  arrivingAt,
  landedAt,
  NOT_STANDING,
  standingAfterMove,
  standingHolds,
} from './flow-arrival';
import type { ArrivalStanding, Arriving } from './flow-arrival';
import {
  drawnCfis,
  foundAt,
  markAfterMove,
  NO_ASKED_PASSAGES,
  NO_PASSAGES,
  NOTHING_ARRIVED_AT,
  passageMark,
  passagesToFind,
  SEEKING,
} from './flow-highlight';
import type { AskedPassage, FoundPassage, PassageMark } from './flow-highlight';
import type { MoveCause } from './flow-move';
import { passageNotice } from './flow-quote';
import type { PassageArrival } from './flow-quote';
import type { FlowSurface } from './flow-surface';

type AskedArrival = {
  readonly book: BookId;
  readonly passage: SoughtPassage;
};

class PassageArrivals {
  notice = $state.raw<string | null>(null);

  #surface: () => FlowSurface | null;
  #here: () => string | null;
  #wanted: readonly AskedPassage[] = NO_ASKED_PASSAGES;
  #found = new Map<string, FoundPassage>();
  #passages: readonly string[] = NO_PASSAGES;
  #marked: PassageMark = NOTHING_ARRIVED_AT;
  #arrivedBy: string | null = null;
  #standing = $state.raw<ArrivalStanding>(NOT_STANDING);
  #asked: AskedArrival | null = null;
  #showing: BookId | null = null;

  constructor(surface: () => FlowSurface | null, here: () => string | null) {
    this.#surface = surface;
    this.#here = here;
  }

  get arrivalHolds(): boolean {
    return standingHolds(this.#standing);
  }

  get arrivalStanding(): boolean {
    return this.notice !== null || this.#marked.kind === 'arrived';
  }

  async jumpToPassage(cfi: string, quote: TextQuote | null): Promise<void> {
    const surface = this.#surface();
    if (surface === null) return;

    this.notice = null;

    let arrival: PassageArrival;
    try {
      arrival = await surface.goToPassage({ cfi, quote });
    } catch {
      return;
    }

    if (surface !== this.#surface()) return;

    this.notice = passageNotice(arrival);
    this.#marked = passageMark(arrival, this.#here());
    surface.mark(this.#passages, this.#marked);
  }

  arriveAt(book: BookId, passage: SoughtPassage): void {
    if (this.#surface() === null || this.#showing !== book) {
      this.#asked = { book, passage };
      return;
    }

    this.#arrive(passage);
  }

  markPassages(passages: readonly AskedPassage[]): void {
    this.#wanted = passages;
    this.#passages = drawnCfis(passages, this.#found);
    const surface = this.#surface();
    if (surface === null) return;

    surface.mark(this.#passages, this.#marked);
    this.#findOn(surface);
  }

  dismissNotice(): void {
    this.notice = null;
  }

  dismissArrival(): void {
    this.notice = null;
    if (this.#marked.kind === 'none') return;

    this.#marked = NOTHING_ARRIVED_AT;
    this.#surface()?.mark(this.#passages, NOTHING_ARRIVED_AT);
  }

  opening(book: BookId): void {
    this.close();
    if (this.#asked?.book !== book) this.#asked = null;
  }

  markOn(surface: FlowSurface): void {
    surface.mark(this.#passages, this.#marked);
    this.#findOn(surface);
  }

  shown(book: BookId): void {
    this.#showing = book;
    const asked = this.#asked;
    if (asked === null) return;

    this.#asked = null;
    this.#arrive(asked.passage);
  }

  moved(place: string, cause: MoveCause): void {
    const marked = markAfterMove(this.#marked, place, cause);
    if (marked !== this.#marked) {
      this.#marked = marked;
      this.#surface()?.mark(this.#passages, marked);
    }
    this.#standing = standingAfterMove(this.#standing, place, cause);
  }

  close(): void {
    this.#found = new Map();
    this.#passages = drawnCfis(this.#wanted, this.#found);
    this.#marked = NOTHING_ARRIVED_AT;
    this.#arrivedBy = null;
    this.#standing = NOT_STANDING;
    this.#showing = null;
    this.notice = null;
  }

  #arrive(passage: SoughtPassage): void {
    if (this.#arrivedBy === passage.cfi) return;

    this.#arrivedBy = passage.cfi;
    const arriving = arrivingAt(passage.cfi);
    this.#standing = arriving;
    void this.jumpToPassage(passage.cfi, passage.quote).then(() => this.#landed(arriving));
  }

  #findOn(surface: FlowSurface): void {
    const found = this.#found;
    for (const passage of passagesToFind(this.#wanted, found)) {
      found.set(passage.cfi, SEEKING);
      void surface.findPassage(passage.quote).then(
        (cfi) => this.#foundOn(surface, found, passage.cfi, foundAt(cfi)),
        () => this.#foundOn(surface, found, passage.cfi, foundAt(null)),
      );
    }
  }

  #foundOn(
    surface: FlowSurface,
    found: Map<string, FoundPassage>,
    cfi: string,
    passage: FoundPassage,
  ): void {
    if (found !== this.#found || surface !== this.#surface()) return;

    found.set(cfi, passage);
    this.#passages = drawnCfis(this.#wanted, found);
    surface.mark(this.#passages, this.#marked);
  }

  #landed(arriving: Arriving): void {
    if (this.#standing !== arriving) return;

    this.#standing = landedAt(arriving.cfi, this.#here());
  }
}

export { PassageArrivals };
