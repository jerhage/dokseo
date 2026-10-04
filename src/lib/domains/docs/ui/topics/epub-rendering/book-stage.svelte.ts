import { match } from 'ts-pattern';
import { DEFAULT_READING_SETTINGS } from '$lib/domains/flowing/domain/reading-settings';
import type { ReadingSettings } from '$lib/domains/flowing/domain/reading-settings';
import { describeCause } from '$lib/shared/cause';
import { sampleEpub } from '../../../domain/sample-epub';
import type { SampleBook } from '../../../domain/sample-epub';
import type {
  DemoChapter,
  DemoInk,
  DemoPaging,
  DemoRelocation,
  DemoSurface,
  OpenFlow,
} from './flow-kit';

type StageState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'opening' }
  | { readonly kind: 'open'; readonly paging: DemoPaging }
  | { readonly kind: 'failed'; readonly message: string };

type StageListeners = {
  readonly moved?: (at: DemoRelocation) => void;
  readonly chapter?: (chapter: DemoChapter) => void;
};

const CLOSED: StageState = { kind: 'closed' };

const OPENING: StageState = { kind: 'opening' };

const PAPER_UNTIL_THE_PROBE_READS: DemoInk = {
  scheme: 'light',
  text: 'CanvasText',
  link: 'LinkText',
  selection: 'Highlight',
  selectionText: 'HighlightText',
};

const EPUB_TYPE = 'application/epub+zip';

function stageNotice(state: StageState): string | null {
  return match(state)
    .with({ kind: 'closed' }, () => null)
    .with({ kind: 'opening' }, () => 'Opening the sample book…')
    .with({ kind: 'open' }, () => null)
    .with({ kind: 'failed' }, (failed) => `The sample book could not be shown: ${failed.message}`)
    .exhaustive();
}

function pagingLabel(paging: DemoPaging): string {
  return match(paging)
    .with({ axis: 'vertical' }, (vertical) => `${vertical.mode}, pages turn top to bottom`)
    .with({ axis: 'horizontal' }, (horizontal) => `horizontal, ${horizontal.direction} columns`)
    .exhaustive();
}

class BookStage {
  state = $state.raw<StageState>(CLOSED);
  location = $state.raw<DemoRelocation | null>(null);

  #open: OpenFlow;
  #listeners: StageListeners;
  #host: HTMLElement | null = null;
  #surface: DemoSurface | null = null;
  #chapter: DemoChapter | null = null;
  #generation = 0;
  #ink: DemoInk = PAPER_UNTIL_THE_PROBE_READS;
  #settings: ReadingSettings = DEFAULT_READING_SETTINGS;

  constructor(open: OpenFlow, listeners: StageListeners = {}) {
    this.#open = open;
    this.#listeners = listeners;
  }

  get surface(): DemoSurface | null {
    return this.#surface;
  }

  get chapter(): DemoChapter | null {
    return this.#chapter;
  }

  get settings(): ReadingSettings {
    return this.#settings;
  }

  attach(host: HTMLElement): void {
    this.#host = host;
  }

  detach(): void {
    this.close();
    this.#host = null;
  }

  async show(book: SampleBook, settings: ReadingSettings): Promise<void> {
    this.close();
    const host = this.#host;
    if (host === null) return;

    const generation = this.#generation;
    this.#settings = settings;
    this.state = OPENING;
    const source = new Blob([sampleEpub(book)], { type: EPUB_TYPE });

    let surface: DemoSurface;
    try {
      surface = await this.#open(
        host,
        {
          source,
          at: null,
          settings,
          ink: this.#ink,
          moved: (at) => this.#moved(generation, at),
        },
        (chapter) => this.#bound(generation, chapter),
      );
    } catch (cause) {
      if (generation === this.#generation)
        this.state = { kind: 'failed', message: describeCause(cause) };
      return;
    }

    if (generation !== this.#generation) {
      surface.destroy();
      return;
    }

    this.#surface = surface;
    this.state = { kind: 'open', paging: surface.paging };
  }

  restyle(settings: ReadingSettings): void {
    this.#settings = settings;
    this.#surface?.restyle(settings, this.#ink);
  }

  paint(ink: DemoInk): void {
    this.#ink = ink;
    this.#surface?.restyle(this.#settings, ink);
  }

  close(): void {
    this.#generation += 1;
    this.#surface?.destroy();
    this.#surface = null;
    this.#chapter = null;
    this.location = null;
    this.state = CLOSED;
  }

  #moved(generation: number, at: DemoRelocation): void {
    if (generation !== this.#generation) return;

    this.location = at;
    this.#listeners.moved?.(at);
  }

  #bound(generation: number, chapter: DemoChapter): void {
    if (generation !== this.#generation) return;

    this.#chapter = chapter;
    this.#listeners.chapter?.(chapter);
  }
}

export { BookStage, pagingLabel, stageNotice };
export type { StageListeners, StageState };
