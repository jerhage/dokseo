import type { FoliateBook, View } from 'foliate-js/view.js';
import type { PageTurner } from './flow-turn';

type FlowSurface = {
  destroy(): void;
};

type BindChapter = (doc: Document, pages: PageTurner) => void;

const EPUB_MEDIA_TYPE = 'application/epub+zip';

const SOURCE_FILE_NAME = 'book.epub';

const OPENS_AT_THE_FIRST_SECTION = 0;

function tearDown(view: View, book: FoliateBook): void {
  view.close();
  book.destroy();
  view.remove();
}

async function openFlowSurface(
  host: HTMLElement,
  source: Blob,
  bind: BindChapter,
): Promise<FlowSurface> {
  const { View: FoliateView, makeBook } = await import('foliate-js/view.js');
  const book = await makeBook(new File([source], SOURCE_FILE_NAME, { type: EPUB_MEDIA_TYPE }));
  const view = new FoliateView();
  view.addEventListener('load', (loaded) => {
    bind(loaded.detail.doc, view);
  });
  host.append(view);

  try {
    await view.open(book);
    const arrived = await view.goTo(OPENS_AT_THE_FIRST_SECTION);
    if (arrived === undefined) throw new Error('its first section could not be laid out');
  } catch (cause) {
    tearDown(view, book);
    throw cause;
  }

  return {
    destroy: () => {
      tearDown(view, book);
    },
  };
}

export { openFlowSurface };
export type { BindChapter, FlowSurface };
