import { unexpectedMessage } from './unexpected-failure';
import type { BookId } from './ids';
import type { Notify } from './notice';
import { samePlace } from './reading-place';
import type { ReadingPlace } from './reading-place';

type AfterFailure = 'keeps-place' | 'forgets-place';

type PlaceSaved =
  | { readonly kind: 'kept' }
  | { readonly kind: 'refused'; readonly message: string };

type PlaceKeeperOptions<P extends ReadingPlace> = {
  readonly save: (id: BookId, place: P) => Promise<PlaceSaved>;
  readonly notify: Notify;
  readonly afterFailure: AfterFailure;
  readonly generation?: () => number;
  readonly onSettle?: (place: P) => void;
};

type PendingSave<P extends ReadingPlace> = {
  readonly id: BookId;
  readonly place: P;
  readonly timer: ReturnType<typeof setTimeout>;
};

const PLACE_SAVE_DELAY_MS = 500;

const PLACE_FAILED = 'Could not save your place';

const PLACE_KEPT: PlaceSaved = { kind: 'kept' };

function unchanging(): number {
  return 0;
}

class PlaceKeeper<P extends ReadingPlace> {
  #options: PlaceKeeperOptions<P>;
  #generation: () => number;
  #saving: PendingSave<P> | null = null;
  #stored: P | null = null;
  #failing = false;

  constructor(options: PlaceKeeperOptions<P>) {
    this.#options = options;
    this.#generation = options.generation ?? unchanging;
  }

  get latest(): P | null {
    return this.#saving?.place ?? this.#stored;
  }

  restart(): void {
    this.#stored = null;
    this.#failing = false;
  }

  assumeStored(place: P | null): void {
    this.#stored = place;
  }

  schedule(id: BookId, place: P): void {
    const waiting = this.#saving;
    if (waiting !== null) clearTimeout(waiting.timer);

    const timer = setTimeout(() => {
      this.#saving = null;
      this.#options.onSettle?.(place);
      if (!this.#alreadyStored(place)) void this.persist(id, place);
    }, PLACE_SAVE_DELAY_MS);

    this.#saving = { id, place, timer };
  }

  flush(): void {
    const waiting = this.#saving;
    if (waiting === null) return;

    clearTimeout(waiting.timer);
    this.#saving = null;
    if (this.#alreadyStored(waiting.place)) return;
    void this.persist(waiting.id, waiting.place);
  }

  async persist(id: BookId, place: P): Promise<void> {
    const generation = this.#generation();
    this.#stored = place;

    let saved: PlaceSaved;
    try {
      saved = await this.#options.save(id, place);
    } catch (cause) {
      if (generation !== this.#generation()) return;
      this.#failed(place, unexpectedMessage(cause));
      return;
    }

    if (generation !== this.#generation()) return;
    if (saved.kind === 'kept') {
      this.#failing = false;
      return;
    }
    this.#failed(place, saved.message);
  }

  #alreadyStored(place: P): boolean {
    const stored = this.#stored;
    return stored !== null && samePlace(stored, place);
  }

  #failed(place: P, message: string): void {
    if (this.#options.afterFailure === 'forgets-place' && this.#alreadyStored(place)) {
      this.#stored = null;
    }
    if (this.#failing) return;
    this.#failing = true;
    this.#options.notify({ tone: 'danger', title: PLACE_FAILED, message });
  }
}

export { PLACE_FAILED, PLACE_KEPT, PLACE_SAVE_DELAY_MS, PlaceKeeper };
export type { AfterFailure, PlaceKeeperOptions, PlaceSaved };
