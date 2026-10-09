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

function createPassageArrivals(surface: () => FlowSurface | null, here: () => string | null) {
  let notice = $state.raw<string | null>(null);
  let standing = $state.raw<ArrivalStanding>(NOT_STANDING);
  let wanted: readonly AskedPassage[] = NO_ASKED_PASSAGES;
  let found = new Map<string, FoundPassage>();
  let passages: readonly string[] = NO_PASSAGES;
  let marked: PassageMark = NOTHING_ARRIVED_AT;
  let arrivedBy: string | null = null;
  let asked: AskedArrival | null = null;
  let showing: BookId | null = null;

  function foundOn(
    on: FlowSurface,
    map: Map<string, FoundPassage>,
    cfi: string,
    passage: FoundPassage,
  ): void {
    if (map !== found || on !== surface()) return;

    map.set(cfi, passage);
    passages = drawnCfis(wanted, map);
    on.mark(passages, marked);
  }

  function findOn(on: FlowSurface): void {
    const map = found;
    for (const passage of passagesToFind(wanted, map)) {
      map.set(passage.cfi, SEEKING);
      void on.findPassage(passage.quote).then(
        (cfi) => foundOn(on, map, passage.cfi, foundAt(cfi)),
        () => foundOn(on, map, passage.cfi, foundAt(null)),
      );
    }
  }

  function landed(arriving: Arriving): void {
    if (standing !== arriving) return;

    standing = landedAt(arriving.cfi, here());
  }

  async function jumpToPassage(cfi: string, quote: TextQuote | null): Promise<void> {
    const current = surface();
    if (current === null) return;

    notice = null;

    let arrival: PassageArrival;
    try {
      arrival = await current.goToPassage({ cfi, quote });
    } catch {
      return;
    }

    if (current !== surface()) return;

    notice = passageNotice(arrival);
    marked = passageMark(arrival, here());
    current.mark(passages, marked);
  }

  function arrive(passage: SoughtPassage): void {
    if (arrivedBy === passage.cfi) return;

    arrivedBy = passage.cfi;
    const arriving = arrivingAt(passage.cfi);
    standing = arriving;
    void jumpToPassage(passage.cfi, passage.quote).then(() => landed(arriving));
  }

  function close(): void {
    found = new Map();
    passages = drawnCfis(wanted, found);
    marked = NOTHING_ARRIVED_AT;
    arrivedBy = null;
    standing = NOT_STANDING;
    showing = null;
    notice = null;
  }

  return {
    get notice(): string | null {
      return notice;
    },
    get arrivalHolds(): boolean {
      return standingHolds(standing);
    },
    get arrivalStanding(): boolean {
      return notice !== null || marked.kind === 'arrived';
    },
    jumpToPassage,
    arriveAt(book: BookId, passage: SoughtPassage): void {
      if (surface() === null || showing !== book) {
        asked = { book, passage };
        return;
      }

      arrive(passage);
    },
    markPassages(next: readonly AskedPassage[]): void {
      wanted = next;
      passages = drawnCfis(next, found);
      const current = surface();
      if (current === null) return;

      current.mark(passages, marked);
      findOn(current);
    },
    dismissNotice(): void {
      notice = null;
    },
    dismissArrival(): void {
      notice = null;
      if (marked.kind === 'none') return;

      marked = NOTHING_ARRIVED_AT;
      surface()?.mark(passages, NOTHING_ARRIVED_AT);
    },
    opening(book: BookId): void {
      close();
      if (asked?.book !== book) asked = null;
    },
    markOn(on: FlowSurface): void {
      on.mark(passages, marked);
      findOn(on);
    },
    shown(book: BookId): void {
      showing = book;
      const wantedArrival = asked;
      if (wantedArrival === null) return;

      asked = null;
      arrive(wantedArrival.passage);
    },
    moved(place: string, cause: MoveCause): void {
      const next = markAfterMove(marked, place, cause);
      if (next !== marked) {
        marked = next;
        surface()?.mark(passages, next);
      }
      standing = standingAfterMove(standing, place, cause);
    },
    close,
  };
}

type PassageArrivalsHook = ReturnType<typeof createPassageArrivals>;

export { createPassageArrivals };
export type { PassageArrivalsHook };
