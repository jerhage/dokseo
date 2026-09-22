import type { FoliateBook, Relocation, TocItem, View } from 'foliate-js/view.js';
import { sanitiseChapter } from './chapter-sanitiser';
import { sanitiseChapters } from './chapter-transform';
import { flowStyles } from './flow-styles';
import type { ReadingSettings } from '../domain/reading-settings';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { PageTurner } from './flow-turn';

type FlowSurface = {
  readonly pages: PageTurner;
  readonly direction: ReadingDirection;
  readonly toc: readonly TocItem[] | null;
  readonly ticks: readonly number[];
  seek(fraction: number): void;
  jump(href: string): void;
  restyle(settings: ReadingSettings): void;
  destroy(): void;
};

type FlowOpening = {
  readonly source: Blob;
  readonly at: string | null;
  readonly settings: ReadingSettings;
  readonly moved: (at: Relocation) => void;
};

type BindChapter = (doc: Document, pages: PageTurner) => void;

type Navigable = Pick<View, 'goTo'>;

const EPUB_MEDIA_TYPE = 'application/epub+zip';

const SOURCE_FILE_NAME = 'book.epub';

const OPENS_AT_THE_FIRST_SECTION = 0;

const SPINE_SAYS_RIGHT_TO_LEFT = 'rtl';

function bookDirection(book: FoliateBook): ReadingDirection {
  return book.dir === SPINE_SAYS_RIGHT_TO_LEFT ? 'rtl' : 'ltr';
}

function tearDown(view: View, book: FoliateBook): void {
  view.close();
  book.destroy();
  view.remove();
}

async function openAt(view: Navigable, at: string | null): Promise<boolean> {
  if (at !== null) {
    const resumed = await view.goTo(at);
    if (resumed !== undefined) return true;
  }

  const started = await view.goTo(OPENS_AT_THE_FIRST_SECTION);
  return started !== undefined;
}

async function openFlowSurface(
  host: HTMLElement,
  opening: FlowOpening,
  bind: BindChapter,
): Promise<FlowSurface> {
  const { View: FoliateView, makeBook } = await import('foliate-js/view.js');
  const book = await makeBook(
    new File([opening.source], SOURCE_FILE_NAME, { type: EPUB_MEDIA_TYPE }),
  );
  sanitiseChapters(book, sanitiseChapter);

  const view = new FoliateView();
  view.addEventListener('load', (loaded) => {
    bind(loaded.detail.doc, view);
  });
  view.addEventListener('relocate', (moved) => {
    opening.moved(moved.detail);
  });
  host.append(view);

  try {
    await view.open(book);
    view.renderer.setStyles(flowStyles(opening.settings));
    const laidOut = await openAt(view, opening.at);
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
      void view.goTo({ fraction });
    },
    jump: (href: string) => {
      void view.goTo(href);
    },
    restyle: (settings: ReadingSettings) => {
      view.renderer.setStyles(flowStyles(settings));
    },
    destroy: () => {
      tearDown(view, book);
    },
  };
}

export { openAt, openFlowSurface };
export type { BindChapter, FlowOpening, FlowSurface };
