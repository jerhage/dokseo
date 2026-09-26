import type {
  Annotation,
  DrawnAnnotation,
  FoliateBook,
  FractionTarget,
  HighlightStyle,
  Relocation,
  TocItem,
  View,
} from 'foliate-js/view.js';
import { sanitiseChapter } from './chapter-sanitiser';
import { sanitiseChapters, sanitisedDocument, treatmentOf } from './chapter-transform';
import type { SanitiseChapter } from './chapter-transform';
import { leaveOutSectionsWithNoBody, sectionWithABody, spineOf } from './flow-spine';
import type { Spine } from './flow-spine';
import {
  ARRIVED_BORDER_WIDTH,
  highlightChange,
  joinedLines,
  passageColour,
} from './flow-highlight';
import type { PassageMark, PassageWeight } from './flow-highlight';
import { flowStyles } from './flow-styles';
import type { PageInk } from './flow-styles';
import type { ReadingSettings } from '../domain/reading-settings';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { TextQuote } from '$lib/shared/anchor';
import type { LiftedPassage } from './flow-lift';
import { quoteRange } from './flow-passage';
import type { ChapterCfis } from './flow-passage';
import { arrivedAtTheCfi, foundByItsText, THE_PASSAGE_IS_LOST } from './flow-quote';
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
  mark(passages: readonly string[], arrived: PassageMark): void;
  restyle(settings: ReadingSettings, ink: PageInk): void;
  destroy(): void;
};

type FlowOpening = {
  readonly source: Blob;
  readonly at: string | null;
  readonly settings: ReadingSettings;
  readonly ink?: PageInk;
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

type Drawable = Pick<DrawnAnnotation, 'annotation' | 'draw'>;

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
  if (stored !== undefined) return arrivedAtTheCfi(passage.cfi);

  const fresh = await find(passage.quote);
  if (fresh === null) return THE_PASSAGE_IS_LOST;

  const refound = await navigate(view, spine, fresh);
  return refound === undefined ? THE_PASSAGE_IS_LOST : foundByItsText(fresh);
}

function drawn(view: Annotatable, annotation: Annotation): void {
  void view.addAnnotation(annotation).catch(() => undefined);
}

function drawPassage(
  shown: ReadonlyMap<string, PassageWeight>,
  drawing: Drawable,
  wash: HighlightStyle,
  ring: HighlightStyle,
): void {
  const weight = shown.get(drawing.annotation.value);
  const colour = passageColour(weight);
  if (weight === 'arrived') {
    drawing.draw((rects, options) => ring(joinedLines(rects), options), {
      color: colour,
      width: ARRIVED_BORDER_WIDTH,
    });
    return;
  }

  drawing.draw(wash, { color: colour });
}

function markPassages(
  view: Annotatable,
  shown: Map<string, PassageWeight>,
  asked: readonly string[],
  mark: PassageMark,
): void {
  const change = highlightChange(shown, asked, mark);

  for (const cfi of change.removed) {
    shown.delete(cfi);
    void view.deleteAnnotation({ value: cfi }).catch(() => undefined);
  }

  for (const passage of change.added) {
    shown.set(passage.cfi, passage.weight);
    drawn(view, { value: passage.cfi });
  }
}

function redrawPassages(view: Annotatable, shown: ReadonlyMap<string, PassageWeight>): void {
  for (const cfi of shown.keys()) drawn(view, { value: cfi });
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
  const shown = new Map<string, PassageWeight>();
  view.addEventListener('draw-annotation', (drawing) => {
    drawPassage(shown, drawing.detail, Overlayer.highlight, Overlayer.outline);
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
    view.renderer.setStyles(flowStyles(opening.settings, opening.ink));
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
    mark: (passages: readonly string[], arrived: PassageMark) => {
      markPassages(view, shown, passages, arrived);
    },
    goToPassage: (passage: LiftedPassage) =>
      goToPassage(view, spine, (quote) => passageCfi(book, view, sanitiseChapter, quote), passage),
    restyle: (settings: ReadingSettings, ink: PageInk) => {
      view.renderer.setStyles(flowStyles(settings, ink));
    },
    destroy: () => {
      tearDown(view, book);
    },
  };
}

export {
  drawPassage,
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
  Drawable,
  FlowOpening,
  FindPassage,
  FlowSurface,
  FlowTarget,
  Navigable,
  Searchable,
};
