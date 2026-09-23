import type { Relocation, TocItem } from 'foliate-js/view.js';
import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { TextQuote } from '$lib/shared/anchor';
import type { BookId } from '$lib/shared/ids';
import { resumedCfi, samePlace, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';
import { currentEntryKey, flowContents, NO_CONTENTS } from './flow-contents';
import type { ContentsEntry, FlowContents } from './flow-contents';
import { NO_PASSAGES } from './flow-highlight';
import {
  chapterTicks,
  flowLocation,
  flowProgress,
  NO_CHAPTER_TICKS,
  scrubbedFraction,
} from './flow-progress';
import type { FlowLocation, FlowProgress } from './flow-progress';
import { passageNotice } from './flow-quote';
import type { PassageArrival } from './flow-quote';
import type { FlowOpening, FlowSurface } from './flow-surface';
import { moveForTurn, turnPage } from './flow-turn';
import type { FlowTurn } from './flow-turn';

type OpenOutcome = Awaited<ReturnType<Container['library']['openForReading']>>;

type OpenedBook = Extract<OpenOutcome, { readonly ok: true }>['value'];

type FlowBook = Extract<OpenedBook, { readonly kind: 'flow' }>['book'];

type SourceOutcome = Awaited<ReturnType<Container['library']['readSource']>>;

type EditOutcome = Awaited<ReturnType<Container['library']['editBook']>>;

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

type PendingSave = {
  readonly id: BookId;
  readonly place: ReadingPlace;
  readonly timer: ReturnType<typeof setTimeout>;
};

const NOT_OPENED: FlowState = { kind: 'idle' };

const OPENING: FlowState = { kind: 'opening' };

const SHOWING_THE_BOOK: FlowState = { kind: 'ready' };

const NOTHING_OVER_THE_BOOK: FlowCurtain = { kind: 'none' };

const WAITING_FOR_THE_BOOK: FlowCurtain = { kind: 'opening' };

const PLACE_SAVE_DELAY_MS = 500;

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
  reported = $state.raw<TocItem | null>(null);
  settings = $state.raw<ReadingSettings>(DEFAULT_READING_SETTINGS);
  notice = $state.raw<string | null>(null);

  #container: Container;
  #generation = 0;
  #surface: FlowSurface | null = null;
  #saving: PendingSave | null = null;
  #placed: ReadingPlace | null = null;
  #passages: readonly string[] = NO_PASSAGES;

  constructor(container: Container) {
    this.#container = container;
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

  async open(book: FlowBook, show: ShowFlowBook): Promise<void> {
    this.#flushSave();
    const generation = ++this.#generation;
    this.#release();
    this.state = OPENING;
    this.#placed = null;
    this.location = null;
    this.contents = NO_CONTENTS;
    this.ticks = NO_CHAPTER_TICKS;
    this.direction = BEFORE_THE_BOOK_SAYS;
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
    this.#placed = book.position;

    const chosen = await this.#container.flowing.readReadingSettings();
    if (generation !== this.#generation) return;

    this.settings = chosen;

    let surface: FlowSurface;
    try {
      surface = await show({
        source: stored.value,
        at,
        settings: chosen,
        moved: (relocation) => {
          this.#moved(generation, book.id, relocation);
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
    surface.mark(this.#passages);
    this.contents = flowContents(surface.toc);
    this.ticks = chapterTicks(surface.ticks);
    this.direction = surface.direction;
    this.state = SHOWING_THE_BOOK;
  }

  close(): void {
    this.#flushSave();
    this.#generation += 1;
    this.#release();
    this.state = NOT_OPENED;
    this.location = null;
    this.contents = NO_CONTENTS;
    this.ticks = NO_CHAPTER_TICKS;
    this.direction = BEFORE_THE_BOOK_SAYS;
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

  async jumpToPassage(cfi: string, quote: TextQuote): Promise<void> {
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
  }

  markPassages(passages: readonly string[]): void {
    this.#passages = passages;
    this.#surface?.mark(passages);
  }

  dismissNotice(): void {
    this.notice = null;
  }

  restyle(settings: ReadingSettings): void {
    this.settings = settings;
    this.#surface?.restyle(settings);
    void this.#remember(settings);
  }

  seek(asked: number): void {
    const target = scrubbedFraction(this.progress, asked);
    if (target === null) return;

    this.#surface?.seek(target);
  }

  #moved(generation: number, id: BookId, relocation: Relocation): void {
    if (generation !== this.#generation) return;

    const here = flowLocation(relocation);
    this.location = here;
    this.reported = relocation.tocItem ?? null;
    const place = textPlace(here.cfi, here.fraction);

    const waiting = this.#saving;
    if (waiting !== null) clearTimeout(waiting.timer);

    const timer = setTimeout(() => {
      this.#saving = null;
      if (!this.#alreadyStored(place)) void this.#persist(id, place);
    }, PLACE_SAVE_DELAY_MS);

    this.#saving = { id, place, timer };
  }

  #alreadyStored(place: ReadingPlace): boolean {
    const placed = this.#placed;
    return placed !== null && samePlace(placed, place);
  }

  async #remember(settings: ReadingSettings): Promise<void> {
    try {
      await this.#container.flowing.saveReadingSettings(settings);
    } catch {
      return;
    }
  }

  #flushSave(): void {
    const waiting = this.#saving;
    if (waiting === null) return;

    clearTimeout(waiting.timer);
    this.#saving = null;
    if (this.#alreadyStored(waiting.place)) return;
    void this.#persist(waiting.id, waiting.place);
  }

  async #persist(id: BookId, place: ReadingPlace): Promise<void> {
    this.#placed = place;

    let saved: EditOutcome;
    try {
      saved = await this.#container.library.editBook(id, { position: place });
    } catch {
      this.#forget(place);
      return;
    }

    if (!saved.ok) this.#forget(place);
  }

  #forget(place: ReadingPlace): void {
    if (this.#alreadyStored(place)) this.#placed = null;
  }

  #release(): void {
    this.#surface?.destroy();
    this.#surface = null;
  }
}

export { FlowView, PLACE_SAVE_DELAY_MS };
export type { FlowBook, FlowCurtain, FlowState, ShowFlowBook };
