import type { TocItem } from 'foliate-js/view.js';
import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { SoughtPassage, TextQuote } from '$lib/shared/anchor';
import { describeCause } from '$lib/shared/cause';
import type { BookId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { PlaceKeeper } from '$lib/shared/place-keeper';
import { resumedCfi, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import type { ReadingSettings, ReadingSettingsError } from '../domain/reading-settings';
import {
  arrivingAt,
  landedAt,
  NOT_STANDING,
  standingAfterMove,
  standingHolds,
} from './flow-arrival';
import type { ArrivalStanding, Arriving } from './flow-arrival';
import { currentEntryKey, flowContents, NO_CONTENTS } from './flow-contents';
import type { ContentsEntry, FlowContents } from './flow-contents';
import { markAfterMove, NO_PASSAGES, NOTHING_ARRIVED_AT, passageMark } from './flow-highlight';
import type { PassageMark } from './flow-highlight';
import type { FlowRelocation, MoveCause } from './flow-move';
import {
  chapterTicks,
  flowLocation,
  flowProgress,
  NO_CHAPTER_TICKS,
  scrubbedFraction,
} from './flow-progress';
import type { FlowLocation, FlowProgress } from './flow-progress';
import { passageNotice } from './flow-quote';
import { INK_FOR_THE_DARK_PAGE, sameInk } from './flow-styles';
import type { PageInk } from './flow-styles';
import type { PassageArrival } from './flow-quote';
import type { FlowOpening, FlowSurface } from './flow-surface';
import { moveForTurn, turnPage } from './flow-turn';
import type { FlowTurn } from './flow-turn';
import { LEFT_TO_RIGHT_PAGES } from './flow-writing-mode';
import type { BookPaging } from './flow-writing-mode';

type OpenOutcome = Awaited<ReturnType<Container['library']['openForReading']>>;

type OpenedBook = Extract<OpenOutcome, { readonly ok: true }>['value'];

type FlowBook = Extract<OpenedBook, { readonly kind: 'flow' }>['book'];

type SourceOutcome = Awaited<ReturnType<Container['library']['readSource']>>;

type LibraryFailure = Extract<SourceOutcome, { readonly ok: false }>['error'];

type ShowFlowBook = (opening: FlowOpening) => Promise<FlowSurface>;

type FlowState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'opening' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'failed'; readonly message: string };

type FlowCurtain =
  | { readonly kind: 'none' }
  | { readonly kind: 'opening' }
  | { readonly kind: 'notice'; readonly message: string };

type AskedArrival = {
  readonly book: BookId;
  readonly passage: SoughtPassage;
};

const NOT_OPENED: FlowState = { kind: 'idle' };

const OPENING: FlowState = { kind: 'opening' };

const SHOWING_THE_BOOK: FlowState = { kind: 'ready' };

const NOTHING_OVER_THE_BOOK: FlowCurtain = { kind: 'none' };

const WAITING_FOR_THE_BOOK: FlowCurtain = { kind: 'opening' };

const SETTINGS_FAILED = 'Could not save the text settings';

function describeLibraryFailure(error: LibraryFailure): string {
  return match(error)
    .with({ kind: 'not-found' }, () => 'That book is no longer stored on this device.')
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so that book cannot be read.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

function describePlaceFailure(error: LibraryFailure): string {
  return match(error)
    .with({ kind: 'not-found' }, () => 'That book is no longer stored on this device.')
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so your place cannot be kept.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

function describeSettingsFailure(error: ReadingSettingsError): string {
  return match(error)
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so these settings cannot be kept.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

function curtainFor(state: FlowState): FlowCurtain {
  return match(state)
    .with({ kind: 'idle' }, () => NOTHING_OVER_THE_BOOK)
    .with({ kind: 'opening' }, () => WAITING_FOR_THE_BOOK)
    .with({ kind: 'ready' }, () => NOTHING_OVER_THE_BOOK)
    .with({ kind: 'failed' }, (stopped) => ({ kind: 'notice' as const, message: stopped.message }))
    .exhaustive();
}

const BEFORE_THE_BOOK_SAYS: ReadingDirection = 'ltr';

class FlowView {
  state = $state.raw<FlowState>(NOT_OPENED);
  location = $state.raw<FlowLocation | null>(null);
  contents = $state.raw<FlowContents>(NO_CONTENTS);
  ticks = $state.raw<readonly number[]>(NO_CHAPTER_TICKS);
  direction = $state.raw<ReadingDirection>(BEFORE_THE_BOOK_SAYS);
  paging = $state.raw<BookPaging>(LEFT_TO_RIGHT_PAGES);
  reported = $state.raw<TocItem | null>(null);
  settings = $state.raw<ReadingSettings>(DEFAULT_READING_SETTINGS);
  notice = $state.raw<string | null>(null);

  #container: Container;
  #notify: Notify;
  #generation = 0;
  #surface: FlowSurface | null = null;
  #places: PlaceKeeper<ReadingPlace, LibraryFailure>;
  #passages: readonly string[] = NO_PASSAGES;
  #marked: PassageMark = NOTHING_ARRIVED_AT;
  #arrivedBy: string | null = null;
  #standing = $state.raw<ArrivalStanding>(NOT_STANDING);
  #asked: AskedArrival | null = null;
  #showing: BookId | null = null;
  #ink: PageInk = INK_FOR_THE_DARK_PAGE;

  constructor(container: Container, notify: Notify) {
    this.#container = container;
    this.#notify = notify;
    this.#places = new PlaceKeeper({
      save: (id, place) => this.#container.library.saveReadingPlace(id, place),
      describe: describePlaceFailure,
      notify,
      afterFailure: 'forgets-place',
    });
  }

  get curtain(): FlowCurtain {
    return curtainFor(this.state);
  }

  get progress(): FlowProgress {
    return flowProgress(this.location);
  }

  get chapter(): string | null {
    return this.location?.chapter ?? null;
  }

  get currentKey(): string | null {
    return currentEntryKey(this.contents, this.reported);
  }

  async open(book: FlowBook, show: ShowFlowBook, onmoved?: () => void): Promise<void> {
    this.#places.flush();
    const generation = ++this.#generation;
    this.#release();
    this.state = OPENING;
    this.#marked = NOTHING_ARRIVED_AT;
    this.#arrivedBy = null;
    this.#standing = NOT_STANDING;
    this.#showing = null;
    if (this.#asked?.book !== book.id) this.#asked = null;
    this.#places.restart();
    this.location = null;
    this.contents = NO_CONTENTS;
    this.ticks = NO_CHAPTER_TICKS;
    this.direction = BEFORE_THE_BOOK_SAYS;
    this.paging = LEFT_TO_RIGHT_PAGES;
    this.reported = null;
    this.notice = null;

    let stored: SourceOutcome;
    try {
      stored = await this.#container.library.readSource(book.id);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.state = { kind: 'failed', message: `That book could not be read: ${String(cause)}` };
      return;
    }

    if (generation !== this.#generation) return;

    if (!stored.ok) {
      this.state = { kind: 'failed', message: describeLibraryFailure(stored.error) };
      return;
    }

    const at = resumedCfi(book.position);
    this.#places.assumeStored(book.position);

    const chosen = await this.#container.flowing.readReadingSettings();
    if (generation !== this.#generation) return;

    this.settings = chosen;

    const inked = this.#ink;
    let surface: FlowSurface;
    try {
      surface = await show({
        source: stored.value,
        at,
        settings: chosen,
        ink: inked,
        moved: (relocation) => {
          this.#moved(generation, book.id, relocation, onmoved);
        },
      });
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.state = {
        kind: 'failed',
        message: `This book could not be displayed: ${String(cause)}`,
      };
      return;
    }

    if (generation !== this.#generation) {
      surface.destroy();
      return;
    }

    this.#surface = surface;
    if (!sameInk(inked, this.#ink)) surface.restyle(this.settings, this.#ink);
    surface.mark(this.#passages, this.#marked);
    this.contents = flowContents(surface.toc);
    this.ticks = chapterTicks(surface.ticks);
    this.direction = surface.direction;
    this.paging = surface.paging;
    this.state = SHOWING_THE_BOOK;
    this.#showing = book.id;

    const asked = this.#asked;
    if (asked === null) return;

    this.#asked = null;
    this.#arrive(asked.passage);
  }

  close(): void {
    this.#places.flush();
    this.#generation += 1;
    this.#release();
    this.#marked = NOTHING_ARRIVED_AT;
    this.#arrivedBy = null;
    this.#standing = NOT_STANDING;
    this.#showing = null;
    this.state = NOT_OPENED;
    this.location = null;
    this.contents = NO_CONTENTS;
    this.ticks = NO_CHAPTER_TICKS;
    this.direction = BEFORE_THE_BOOK_SAYS;
    this.paging = LEFT_TO_RIGHT_PAGES;
    this.reported = null;
    this.notice = null;
  }

  turn(turn: FlowTurn): void {
    const surface = this.#surface;
    if (surface === null) return;

    turnPage(surface.pages, moveForTurn(turn));
  }

  jumpTo(entry: ContentsEntry): void {
    if (entry.kind === 'heading') return;

    this.#surface?.jump(entry.href);
  }

  async jumpToPassage(cfi: string, quote: TextQuote | null): Promise<void> {
    const surface = this.#surface;
    if (surface === null) return;

    this.notice = null;

    let arrival: PassageArrival;
    try {
      arrival = await surface.goToPassage({ cfi, quote });
    } catch {
      return;
    }

    if (surface !== this.#surface) return;

    this.notice = passageNotice(arrival);
    this.#marked = passageMark(arrival, this.location?.cfi ?? null);
    surface.mark(this.#passages, this.#marked);
  }

  arriveAt(book: BookId, passage: SoughtPassage): void {
    if (this.#surface === null || this.#showing !== book) {
      this.#asked = { book, passage };
      return;
    }

    this.#arrive(passage);
  }

  markPassages(passages: readonly string[]): void {
    this.#passages = passages;
    this.#surface?.mark(passages, this.#marked);
  }

  get arrivalHolds(): boolean {
    return standingHolds(this.#standing);
  }

  get arrivalStanding(): boolean {
    return this.notice !== null || this.#marked.kind === 'arrived';
  }

  dismissNotice(): void {
    this.notice = null;
  }

  dismissArrival(): void {
    this.notice = null;
    if (this.#marked.kind === 'none') return;

    this.#marked = NOTHING_ARRIVED_AT;
    this.#surface?.mark(this.#passages, NOTHING_ARRIVED_AT);
  }

  restyle(settings: ReadingSettings): void {
    this.settings = settings;
    this.#surface?.restyle(settings, this.#ink);
    void this.#remember(settings);
  }

  paint(ink: PageInk): void {
    if (sameInk(this.#ink, ink)) return;

    this.#ink = ink;
    this.#surface?.restyle(this.settings, ink);
  }

  seek(asked: number): void {
    const target = scrubbedFraction(this.progress, asked);
    if (target === null) return;

    this.#surface?.seek(target);
  }

  #moved(
    generation: number,
    id: BookId,
    relocation: FlowRelocation,
    onmoved: (() => void) | undefined,
  ): void {
    if (generation !== this.#generation) return;

    const here = flowLocation(relocation);
    this.location = here;
    this.reported = relocation.tocItem ?? null;
    this.#forgetArrival(here.cfi, relocation.cause);
    this.#standing = standingAfterMove(this.#standing, here.cfi, relocation.cause);
    onmoved?.();
    const place = textPlace(here.cfi, here.fraction);
    this.#places.schedule(id, place);
  }

  #arrive(passage: SoughtPassage): void {
    if (this.#arrivedBy === passage.cfi) return;

    this.#arrivedBy = passage.cfi;
    const arriving = arrivingAt(passage.cfi);
    this.#standing = arriving;
    void this.jumpToPassage(passage.cfi, passage.quote).then(() => this.#landed(arriving));
  }

  #landed(arriving: Arriving): void {
    if (this.#standing !== arriving) return;

    this.#standing = landedAt(arriving.cfi, this.location?.cfi ?? null);
  }

  #forgetArrival(place: string, cause: MoveCause): void {
    const marked = markAfterMove(this.#marked, place, cause);
    if (marked === this.#marked) return;

    this.#marked = marked;
    this.#surface?.mark(this.#passages, marked);
  }

  async #remember(settings: ReadingSettings): Promise<void> {
    let saved: Awaited<ReturnType<Container['flowing']['saveReadingSettings']>>;
    try {
      saved = await this.#container.flowing.saveReadingSettings(settings);
    } catch (cause) {
      this.#fail(SETTINGS_FAILED, describeCause(cause));
      return;
    }

    if (!saved.ok) this.#fail(SETTINGS_FAILED, describeSettingsFailure(saved.error));
  }

  #fail(title: string, message: string): void {
    this.#notify({ tone: 'danger', title, message });
  }

  #release(): void {
    this.#surface?.destroy();
    this.#surface = null;
  }
}

export { FlowView, SETTINGS_FAILED };
export type { FlowBook, FlowCurtain, FlowState, ShowFlowBook };
