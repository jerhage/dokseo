import type {
  Annotation,
  FoliateBook,
  FractionTarget,
  Relocation,
  TocItem,
  View,
} from 'foliate-js/view.js';
import { sanitiseChapter } from './chapter-sanitiser';
import { sanitiseChapters, sanitisedDocument, treatmentOf } from './chapter-transform';
import type { SanitiseChapter } from './chapter-transform';
import { leaveOutSectionsWithNoBody, sectionWithABody, spineOf } from './flow-spine';
import type { Spine } from './flow-spine';
import { highlightChange, PASSAGE_HIGHLIGHT_COLOUR } from './flow-highlight';
import { flowStyles } from './flow-styles';
import type { ReadingSettings } from '../domain/reading-settings';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { TextQuote } from '$lib/shared/anchor';
import type { LiftedPassage } from './flow-lift';
import { quoteRange } from './flow-passage';
import type { ChapterCfis } from './flow-passage';
import { ARRIVED_AT_THE_CFI, FOUND_BY_ITS_TEXT, THE_PASSAGE_IS_LOST } from './flow-quote';
import type { PassageArrival } from './flow-quote';
import type { PageTurner } from './flow-turn';

type FlowSurface = {
  readonly pages: PageTurner;
  readonly direction: ReadingDirection;
  readonly toc: readonly TocItem[] | null;
  readonly ticks: readonly number[];
  seek(fraction: number): void;
  jump(href: string): void;
  goToPassage(passage: LiftedPassage): Promise<PassageArrival>;
  mark(passages: readonly string[]): void;
  restyle(settings: ReadingSettings): void;
  destroy(): void;
};

type FlowOpening = {
  readonly source: Blob;
  readonly at: string | null;
  readonly settings: ReadingSettings;
  readonly moved: (at: Relocation) => void;
};

type ChapterView = {
  readonly doc: Document;
  readonly index: number;
  readonly pages: PageTurner;
  readonly cfis: ChapterCfis;
};

type BindChapter = (chapter: ChapterView) => void;

type Navigable = Pick<View, 'goTo' | 'resolveNavigation'>;

type Annotatable = Pick<View, 'addAnnotation' | 'deleteAnnotation'>;

type Searchable = Pick<FoliateBook, 'sections' | 'resources'>;

type FindPassage = (quote: TextQuote) => Promise<string | null>;

type Closable = Pick<View, 'close' | 'remove'>;

type Destroyable = Pick<FoliateBook, 'destroy'>;

type FlowTarget = number | string | FractionTarget;

const EPUB_MEDIA_TYPE = 'application/epub+zip';

const SOURCE_FILE_NAME = 'book.epub';

const OPENS_AT_THE_FIRST_SECTION = 0;

const SPINE_SAYS_RIGHT_TO_LEFT = 'rtl';

function bookDirection(book: FoliateBook): ReadingDirection {
  return book.dir === SPINE_SAYS_RIGHT_TO_LEFT ? 'rtl' : 'ltr';
}

function attempt(step: () => void): void {
  try {
    step();
  } catch {
    return;
  }
}

function tearDown(view: Closable, book: Destroyable): void {
  attempt(() => {
    view.close();
  });
  attempt(() => {
    book.destroy();
  });
  attempt(() => {
    view.remove();
  });
}

async function navigate(view: Navigable, spine: Spine, target: FlowTarget): Promise<unknown> {
  const resolved = view.resolveNavigation(target);
  if (resolved === undefined) return view.goTo(target);

  const paged = sectionWithABody(spine, resolved.index);
  if (paged === null) return undefined;
  if (paged === resolved.index) return view.goTo(target);

  return view.goTo(paged);
}

async function passageCfi(
  book: Searchable,
  cfis: ChapterCfis,
  sanitise: SanitiseChapter,
  quote: TextQuote,
): Promise<string | null> {
  for (const [index, section] of book.sections.entries()) {
    const open = section.createDocument;
    if (open === undefined) continue;

    const treatment = treatmentOf(book.resources.getItemByHref(section.id)?.mediaType ?? '');
    if (treatment.kind === 'opaque') continue;

    try {
      const loaded = await open();
      const range = quoteRange(sanitisedDocument(loaded, treatment.mediaType, sanitise), quote);
      if (range !== null) return cfis.getCFI(index, range);
    } catch {
      continue;
    }
  }

  return null;
}

async function goToPassage(
  view: Navigable,
  spine: Spine,
  find: FindPassage,
  passage: LiftedPassage,
): Promise<PassageArrival> {
  const stored = await navigate(view, spine, passage.cfi);
  if (stored !== undefined) return ARRIVED_AT_THE_CFI;

  const fresh = await find(passage.quote);
  if (fresh === null) return THE_PASSAGE_IS_LOST;

  const refound = await navigate(view, spine, fresh);
  return refound === undefined ? THE_PASSAGE_IS_LOST : FOUND_BY_ITS_TEXT;
}

function drawn(view: Annotatable, annotation: Annotation): void {
  void view.addAnnotation(annotation).catch(() => undefined);
}

function markPassages(view: Annotatable, shown: Set<string>, asked: readonly string[]): void {
  const change = highlightChange(shown, asked);

  for (const cfi of change.removed) {
    shown.delete(cfi);
    void view.deleteAnnotation({ value: cfi }).catch(() => undefined);
  }

  for (const cfi of change.added) {
    shown.add(cfi);
    drawn(view, { value: cfi });
  }
}

function redrawPassages(view: Annotatable, shown: ReadonlySet<string>): void {
  for (const cfi of shown) drawn(view, { value: cfi });
}

async function openAt(view: Navigable, spine: Spine, at: string | null): Promise<boolean> {
  if (at !== null) {
    const resumed = await navigate(view, spine, at);
    if (resumed !== undefined) return true;
  }

  const started = await navigate(view, spine, OPENS_AT_THE_FIRST_SECTION);
  return started !== undefined;
}

async function openFlowSurface(
  host: HTMLElement,
  opening: FlowOpening,
  bind: BindChapter,
): Promise<FlowSurface> {
  const { View: FoliateView, makeBook } = await import('foliate-js/view.js');
  const { Overlayer } = await import('foliate-js/overlayer.js');
  const book = await makeBook(
    new File([opening.source], SOURCE_FILE_NAME, { type: EPUB_MEDIA_TYPE }),
  );
  sanitiseChapters(book, sanitiseChapter);

  const spine = spineOf(book);
  leaveOutSectionsWithNoBody(book, spine);

  const view = new FoliateView();
  const shown = new Set<string>();
  view.addEventListener('draw-annotation', (drawing) => {
    drawing.detail.draw(Overlayer.highlight, { color: PASSAGE_HIGHLIGHT_COLOUR });
  });
  view.addEventListener('create-overlay', () => {
    queueMicrotask(() => {
      redrawPassages(view, shown);
    });
  });
  view.addEventListener('load', (loaded) => {
    bind({ doc: loaded.detail.doc, index: loaded.detail.index, pages: view, cfis: view });
  });
  view.addEventListener('relocate', (moved) => {
    opening.moved(moved.detail);
  });
  host.append(view);

  try {
    await view.open(book);
    view.renderer.setStyles(flowStyles(opening.settings));
    const laidOut = await openAt(view, spine, opening.at);
    if (!laidOut) throw new Error('its first section could not be laid out');
  } catch (cause) {
    tearDown(view, book);
    throw cause;
  }

  return {
    pages: view,
    direction: bookDirection(book),
    toc: book.toc ?? null,
    ticks: view.getSectionFractions(),
    seek: (fraction: number) => {
      void navigate(view, spine, { fraction });
    },
    jump: (href: string) => {
      void navigate(view, spine, href);
    },
    mark: (passages: readonly string[]) => {
      markPassages(view, shown, passages);
    },
    goToPassage: (passage: LiftedPassage) =>
      goToPassage(view, spine, (quote) => passageCfi(book, view, sanitiseChapter, quote), passage),
    restyle: (settings: ReadingSettings) => {
      view.renderer.setStyles(flowStyles(settings));
    },
    destroy: () => {
      tearDown(view, book);
    },
  };
}

export {
  goToPassage,
  markPassages,
  navigate,
  openAt,
  openFlowSurface,
  passageCfi,
  redrawPassages,
  tearDown,
};
export type {
  Annotatable,
  BindChapter,
  ChapterView,
  Closable,
  Destroyable,
  FlowOpening,
  FindPassage,
  FlowSurface,
  FlowTarget,
  Navigable,
  Searchable,
};
