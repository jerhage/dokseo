import type { QueryClient } from '@tanstack/svelte-query';
import { describeCause } from '$lib/shared/cause';
import type { Container } from '$lib/container';
import type { BookId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { PLACE_KEPT, PlaceKeeper } from '$lib/shared/place-keeper';
import type { PlaceSaved } from '$lib/shared/place-keeper';
import { resumedCfi, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { ReadingSettings } from '../domain/reading-settings';
import { saveReadingPlaceMutation } from '../queries/flowing-queries';
import type { PlaceRequest } from '../queries/flowing-queries';
import { FlowAppearance } from './flow-appearance.svelte';
import type { FlowRelocation } from './flow-move';
import { FlowNavigation } from './flow-navigation.svelte';
import type { FlowOpening, FlowSurface } from './flow-surface';
import { curtainFor, describePlaceFailure, describeSourceFailure } from './flow-view-rules';
import type { FlowCurtain, FlowState, PlaceOutcome, SourceOutcome } from './flow-view-rules';
import { PassageArrivals } from './passage-arrivals.svelte';

type OpenOutcome = Awaited<ReturnType<Container['library']['openForReading']>>;

type FlowBook = Extract<OpenOutcome, { readonly kind: 'flow' }>['book'];

type BookChanged = () => void;

type ShowFlowBook = (opening: FlowOpening) => Promise<FlowSurface>;

const NOT_OPENED: FlowState = { kind: 'idle' };

const OPENING: FlowState = { kind: 'opening' };

const SHOWING_THE_BOOK: FlowState = { kind: 'ready' };

class FlowView {
  state = $state.raw<FlowState>(NOT_OPENED);
  readonly navigation: FlowNavigation;
  readonly arrivals: PassageArrivals;
  readonly appearance: FlowAppearance;

  #container: Container;
  #placing: WriteQuery<PlaceOutcome, PlaceRequest>;
  #generation = 0;
  #surface: FlowSurface | null = null;
  #places: PlaceKeeper<ReadingPlace>;

  constructor(
    container: Container,
    notify: Notify,
    client: QueryClient,
    bookChanged: BookChanged | null = null,
  ) {
    this.#container = container;
    this.#placing = writeQuery(() => ({
      ...saveReadingPlaceMutation(container.library),
      onSuccess: (saved) => {
        if (saved.kind === 'success') bookChanged?.();
      },
    }));
    const surface = (): FlowSurface | null => this.#surface;
    this.navigation = new FlowNavigation(surface);
    this.arrivals = new PassageArrivals(surface, () => this.navigation.location?.cfi ?? null);
    this.appearance = new FlowAppearance(container, notify, client, surface);
    this.#places = new PlaceKeeper({
      save: (id, place) => this.#savePlace(id, place),
      notify,
      afterFailure: 'forgets-place',
    });
  }

  get curtain(): FlowCurtain {
    return curtainFor(this.state);
  }

  async open(
    book: FlowBook,
    settings: ReadingSettings,
    show: ShowFlowBook,
    onmoved?: () => void,
  ): Promise<void> {
    this.#places.flush();
    const generation = ++this.#generation;
    this.#release();
    this.state = OPENING;
    this.arrivals.opening(book.id);
    this.#places.restart();
    this.navigation.reset();

    let stored: SourceOutcome;
    try {
      stored = await this.#container.library.readSource(book.id);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.state = {
        kind: 'failed',
        message: `That book could not be read: ${describeCause(cause)}`,
      };
      return;
    }

    if (generation !== this.#generation) return;

    if (stored.kind !== 'success') {
      this.state = { kind: 'failed', message: describeSourceFailure(stored) };
      return;
    }

    const at = resumedCfi(book.position);
    this.#places.assumeStored(book.position);

    this.appearance.settings = settings;

    const inked = this.appearance.ink;
    let surface: FlowSurface;
    try {
      surface = await show({
        source: stored.source,
        at,
        settings,
        ink: inked,
        moved: (relocation) => {
          this.#moved(generation, book.id, relocation, onmoved);
        },
      });
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.state = {
        kind: 'failed',
        message: `This book could not be displayed: ${describeCause(cause)}`,
      };
      return;
    }

    if (generation !== this.#generation) {
      surface.destroy();
      return;
    }

    this.#surface = surface;
    this.appearance.repaintSince(inked, surface);
    this.arrivals.markOn(surface);
    this.navigation.learn(surface);
    this.state = SHOWING_THE_BOOK;
    this.arrivals.shown(book.id);
  }

  close(): void {
    this.#places.flush();
    this.#generation += 1;
    this.#release();
    this.arrivals.close();
    this.state = NOT_OPENED;
    this.navigation.reset();
  }

  #moved(
    generation: number,
    id: BookId,
    relocation: FlowRelocation,
    onmoved: (() => void) | undefined,
  ): void {
    if (generation !== this.#generation) return;

    const here = this.navigation.moved(relocation);
    this.arrivals.moved(here.cfi, relocation.cause);
    onmoved?.();
    const place = textPlace(here.cfi, here.fraction);
    this.#places.schedule(id, place);
  }

  #release(): void {
    this.#surface?.destroy();
    this.#surface = null;
  }

  async #savePlace(id: BookId, place: ReadingPlace): Promise<PlaceSaved> {
    const saved = await this.#placing.run({ id, place });
    if (saved.kind !== 'success') return { kind: 'refused', message: describePlaceFailure(saved) };
    return PLACE_KEPT;
  }
}

export { FlowView };
export type { BookChanged, FlowBook, ShowFlowBook };
