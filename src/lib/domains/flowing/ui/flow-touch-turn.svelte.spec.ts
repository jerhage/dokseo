import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import type { Container } from '$lib/container';
import { bookId, contentHash } from '$lib/shared/ids';
import { START_OF_THE_TEXT } from '$lib/shared/reading-place';
import { chooseTouchTurns } from '$lib/shared/chosen-touch-turns.svelte';
import { TOUCH_TURNS_KEY } from '$lib/shared/touch-turns';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import '$lib/styles/index.css';
import FlowViewer from './FlowViewer.svelte';
import { FlowView } from './flow-view.svelte';
import type { FlowBook } from './flow-view.svelte';
import { createTestQueryClient } from '$lib/shared/testing/query-client';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/idle-write-query'));

const CONTAINER = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

const OPF = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">urn:uuid:touch-turns</dc:identifier>
<dc:title>Touch</dc:title><dc:language>ja</dc:language>
<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata>
<manifest>
<item id="one" href="chapter-1.xhtml" media-type="application/xhtml+xml"/>
<item id="two" href="chapter-2.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine page-progression-direction="ltr"><itemref idref="one"/><itemref idref="two"/></spine></package>`;

const WORDS_PER_CHAPTER = 900;

const SETTLES_MS = 400;

const LAID_OUT_WITHIN_MS = 8000;

const MOVED_WITHIN_MS = 3000;

const MOST_TURNS_TO_THE_LAST_PAGE = 60;

const FORWARD_EDGE = 0.9;

const FINGER = 11;

const SLOWER_THAN_A_FRAME_MS = 80;

const SECOND_CHAPTER = 1;

function chapter(): string {
  const words = Array.from(
    { length: WORDS_PER_CHAPTER },
    (_unused, n) => `<span>言葉${n}</span>`,
  ).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>ch</title></head>
<body><p>${words}</p></body></html>`;
}

async function epub(): Promise<Blob> {
  const zip = new ZipWriter(new BlobWriter('application/epub+zip'));
  await zip.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
  await zip.add('META-INF/container.xml', new TextReader(CONTAINER));
  await zip.add('OEBPS/content.opf', new TextReader(OPF));
  await zip.add('OEBPS/chapter-1.xhtml', new TextReader(chapter()));
  await zip.add('OEBPS/chapter-2.xhtml', new TextReader(chapter()));
  return zip.close();
}

function novel(): FlowBook {
  return {
    id: bookId('touch-turns'),
    title: 'Touch',
    language: 'ja',
    layoutKind: 'flow',
    direction: 'ltr',
    pagePairing: 'double-after-cover',
    pageFit: 'width',
    sourceKind: 'epub',
    contentHash: contentHash('tt1'),
    fileName: 'book.epub',
    imageCount: 0,
    addedAt: 1758240000000,
    position: START_OF_THE_TEXT,
    lastReadAt: null,
    finishedAt: null,
  };
}

function shelf(source: Blob, book: FlowBook): Container {
  return {
    library: {
      readSource: () => Promise.resolve({ kind: 'success', source }),
      saveReadingPlace: () => Promise.resolve({ kind: 'success', book }),
    },
    flowing: {
      saveReadingSettings: () => Promise.resolve({ kind: 'success' }),
    },
  } as unknown as Container;
}

async function rests(): Promise<void> {
  await new Promise((done) => setTimeout(done, SETTLES_MS));
}

type Chapter = { readonly doc: Document; readonly index: number };

type Section = { load(): Promise<string> };

type Renderer = {
  readonly page: number;
  readonly pages: number;
  readonly sections: Section[];
  next(): Promise<void>;
  getContents(): readonly Chapter[];
};

function paginator(): Renderer {
  const view = document.querySelector('foliate-view');
  if (view === null) throw new Error('foliate never mounted');

  return (view as unknown as { readonly renderer: Renderer }).renderer;
}

function showing(): Chapter {
  const [shown] = paginator().getContents();
  if (shown === undefined) throw new Error('no chapter is laid out');

  return shown;
}

function stage(): HTMLElement {
  const found = document.querySelector<HTMLElement>('.stage');
  if (found === null) throw new Error('the flow stage was never rendered');

  return found;
}

function fingerAt(doc: Document, share: number): { readonly x: number; readonly y: number } {
  const box = stage().getBoundingClientRect();
  const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
  if (frame === undefined) throw new Error('the chapter frame is nowhere');

  return { x: box.left + box.width * share - frame.left, y: box.height / 2 - frame.top };
}

function finger(doc: Document, at: { readonly x: number; readonly y: number }): Touch {
  return new Touch({
    identifier: FINGER,
    target: doc.body,
    clientX: at.x,
    clientY: at.y,
    screenX: at.x,
    screenY: at.y,
  });
}

function touch(doc: Document, kind: string, at: { readonly x: number; readonly y: number }): void {
  const lifted = kind === 'touchend';
  const held = finger(doc, at);
  doc.body.dispatchEvent(
    new TouchEvent(kind, {
      bubbles: true,
      cancelable: true,
      touches: lifted ? [] : [held],
      targetTouches: lifted ? [] : [held],
      changedTouches: [held],
    }),
  );
}

function pointer(
  doc: Document,
  kind: string,
  at: { readonly x: number; readonly y: number },
): void {
  doc.body.dispatchEvent(
    new PointerEvent(kind, {
      bubbles: true,
      cancelable: true,
      clientX: at.x,
      clientY: at.y,
      pointerId: FINGER,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: kind === 'pointerup' ? 0 : 1,
    }),
  );
}

async function tapWithAFinger(share: number): Promise<void> {
  const doc = showing().doc;
  const at = fingerAt(doc, share);
  touch(doc, 'touchstart', at);
  pointer(doc, 'pointerdown', at);
  pointer(doc, 'pointerup', at);
  touch(doc, 'touchend', at);
  await rests();
}

function slowToLoad(index: number): void {
  const section = paginator().sections[index];
  if (section === undefined) throw new Error(`the book has no section ${index}`);

  const load = section.load.bind(section);
  section.load = async () => {
    await new Promise((done) => setTimeout(done, SLOWER_THAN_A_FRAME_MS));
    return load();
  };
}

async function onTheLastPageOfTheFirstChapter(): Promise<void> {
  slowToLoad(SECOND_CHAPTER);

  for (let turn = 0; turn < MOST_TURNS_TO_THE_LAST_PAGE; turn += 1) {
    const renderer = paginator();
    if (renderer.page >= renderer.pages - 2) return;

    await renderer.next();
  }

  throw new Error('the first chapter never reached its last page');
}

async function opened(): Promise<FlowView> {
  const book = novel();
  const source = await epub();
  const view = new FlowView(shelf(source, book), () => undefined, createTestQueryClient());
  render(FlowViewer, {
    view,
    book,
    storedSettings: DEFAULT_READING_SETTINGS,
    edgeClicksTurn: true,
  });

  await expect.poll(() => paginator().pages, { timeout: LAID_OUT_WITHIN_MS }).toBeGreaterThan(2);
  await rests();

  return view;
}

beforeEach(() => {
  chooseTouchTurns('tap-zones');
});

afterEach(() => {
  chooseTouchTurns('swipe-only');
  localStorage.removeItem(TOUCH_TURNS_KEY);
  for (const view of document.querySelectorAll('foliate-view')) view.remove();
});

describe('a finger tap that turns past the end of a chapter', () => {
  it('leaves the next tap free to turn a page', async () => {
    await opened();
    await onTheLastPageOfTheFirstChapter();

    await tapWithAFinger(FORWARD_EDGE);
    await expect.poll(() => showing().index, { timeout: MOVED_WITHIN_MS }).toBe(SECOND_CHAPTER);
    const arrived = paginator().page;

    await tapWithAFinger(FORWARD_EDGE);

    expect(paginator().page).toBeGreaterThan(arrived);
  });

  it('leaves a later jump to a passage free to move the book', async () => {
    const view = await opened();
    const opening = view.navigation.location?.cfi;
    if (opening === undefined) throw new Error('the book reported no place on opening');
    await onTheLastPageOfTheFirstChapter();

    await tapWithAFinger(FORWARD_EDGE);
    await expect.poll(() => showing().index, { timeout: MOVED_WITHIN_MS }).toBe(SECOND_CHAPTER);

    await view.arrivals.jumpToPassage(opening, null);

    expect([showing().index, view.arrivals.notice]).toEqual([0, null]);
  });
});
