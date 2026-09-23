import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import type { Container } from '$lib/container';
import { bookId, contentHash } from '$lib/shared/ids';
import { START_OF_THE_TEXT } from '$lib/shared/reading-place';
import { ok } from '$lib/shared/result';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import FlowViewer from './FlowViewer.svelte';
import { FlowView } from './flow-view.svelte';
import type { FlowBook } from './flow-view.svelte';

const CONTAINER = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

const NAV = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title></head>
<body><nav epub:type="toc"><ol>
<li><a href="chapter-1.xhtml">One</a></li>
<li><a href="chapter-2.xhtml">Two</a></li>
</ol></nav></body></html>`;

const OPF = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">urn:uuid:keys</dc:identifier>
<dc:title>Keys</dc:title><dc:language>ja</dc:language>
<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="one" href="chapter-1.xhtml" media-type="application/xhtml+xml"/>
<item id="two" href="chapter-2.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine page-progression-direction="rtl"><itemref idref="one"/><itemref idref="two"/></spine></package>`;

const WORDS_PER_CHAPTER = 900;

const SETTLES_MS = 400;

const LAID_OUT_WITHIN_MS = 8000;

const TURNS_A_PAGE: readonly string[] = ['ArrowDown', 'PageDown', ' '];

function chapter(): string {
  const words = Array.from(
    { length: WORDS_PER_CHAPTER },
    (_unused, n) => `<span>言葉${n}</span>`,
  ).join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>ch</title></head>
<body><p id="first">そして彼は<span id="word">漢字</span>と言った。</p>
<p>${words}</p></body></html>`;
}

async function epub(): Promise<Blob> {
  const zip = new ZipWriter(new BlobWriter('application/epub+zip'));
  await zip.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
  await zip.add('META-INF/container.xml', new TextReader(CONTAINER));
  await zip.add('OEBPS/content.opf', new TextReader(OPF));
  await zip.add('OEBPS/nav.xhtml', new TextReader(NAV));
  await zip.add('OEBPS/chapter-1.xhtml', new TextReader(chapter()));
  await zip.add('OEBPS/chapter-2.xhtml', new TextReader(chapter()));
  return zip.close();
}

function novel(): FlowBook {
  return {
    id: bookId('keys'),
    title: 'Keys',
    language: 'ja',
    layoutKind: 'flow',
    direction: 'rtl',
    pagePairing: 'double-after-cover',
    pageFit: 'width',
    sourceKind: 'epub',
    contentHash: contentHash('k1'),
    imageCount: 0,
    addedAt: 1758240000000,
    position: START_OF_THE_TEXT,
  };
}

function shelf(source: Blob, book: FlowBook): Container {
  return {
    library: {
      readSource: () => Promise.resolve(ok(source)),
      editBook: () => Promise.resolve(ok(book)),
    },
    flowing: {
      readReadingSettings: () => Promise.resolve(DEFAULT_READING_SETTINGS),
      saveReadingSettings: () => Promise.resolve(ok(undefined)),
    },
  } as unknown as Container;
}

async function rests(): Promise<void> {
  await new Promise((done) => setTimeout(done, SETTLES_MS));
}

type Chapter = { readonly doc: Document };

type Renderer = {
  readonly page: number;
  readonly pages: number;
  getContents(): readonly Chapter[];
};

function paginator(): Renderer {
  const view = document.querySelector('foliate-view');
  if (view === null) throw new Error('foliate never mounted');

  return (view as unknown as { readonly renderer: Renderer }).renderer;
}

function chapterDoc(): Document {
  const [showing] = paginator().getContents();
  if (showing === undefined) throw new Error('no chapter is laid out');

  return showing.doc;
}

function liftButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('button.lift');
}

function pointer(kind: string, buttons: number): PointerEvent {
  return new PointerEvent(kind, {
    bubbles: true,
    cancelable: true,
    clientX: 40,
    clientY: 200,
    pointerId: 11,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons,
  });
}

function pressing(key: string, held: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    composed: true,
    ...held,
  });
}

async function pressedIn(doc: Document, event: KeyboardEvent): Promise<KeyboardEvent> {
  doc.body.dispatchEvent(event);
  await rests();

  return event;
}

async function selectsAWord(doc: Document): Promise<void> {
  const word = doc.getElementById('word');
  if (word === null) throw new Error('the chapter has no word to select');

  doc.body.dispatchEvent(pointer('pointerdown', 1));
  const range = doc.createRange();
  range.selectNodeContents(word);
  doc.getSelection()?.removeAllRanges();
  doc.getSelection()?.addRange(range);
  doc.body.dispatchEvent(pointer('pointerup', 0));
  await rests();
}

async function opened(): Promise<Document> {
  const book = novel();
  const source = await epub();
  render(FlowViewer, { view: new FlowView(shelf(source, book)), book });

  await expect.poll(() => paginator().pages, { timeout: LAID_OUT_WITHIN_MS }).toBeGreaterThan(2);
  await rests();

  return chapterDoc();
}

const heardOnTheHost: KeyboardEvent[] = [];

function listens(event: KeyboardEvent): void {
  heardOnTheHost.push(event);
}

beforeEach(() => {
  window.addEventListener('keydown', listens);
});

afterEach(() => {
  window.removeEventListener('keydown', listens);
  heardOnTheHost.length = 0;
  for (const view of document.querySelectorAll('foliate-view')) view.remove();
});

describe('a key pressed inside a flow chapter', () => {
  it('carries a command-key shortcut out to the host window exactly once', async () => {
    const doc = await opened();

    await pressedIn(doc, pressing('k', { metaKey: true }));

    expect(heardOnTheHost.map((heard) => [heard.key, heard.metaKey])).toEqual([['k', true]]);
  });

  it('sends the shortcut it relayed nowhere near the chapter it came from', async () => {
    const doc = await opened();
    const heardInTheChapter: string[] = [];
    doc.addEventListener('keydown', (event) => heardInTheChapter.push(event.key));

    await pressedIn(doc, pressing('k', { ctrlKey: true }));

    expect([heardInTheChapter.length, heardOnTheHost.length]).toEqual([1, 1]);
  });

  it('keeps every key that turns a page in the chapter, and turns exactly one page', async () => {
    const doc = await opened();

    const turns: number[] = [];
    for (const key of TURNS_A_PAGE) {
      const before = paginator().page;
      await pressedIn(doc, pressing(key));
      turns.push(paginator().page - before);
    }

    expect([turns, heardOnTheHost.length]).toEqual([[1, 1, 1], 0]);
  });

  it('turns exactly one page for the same key pressed on the host', async () => {
    await opened();
    const before = paginator().page;

    await userEvent.keyboard('{ArrowDown}');
    await rests();

    expect(paginator().page - before).toBe(1);
  });

  it('keeps an Escape the chapter has already answered', async () => {
    const doc = await opened();
    await selectsAWord(doc);
    expect(liftButton()).not.toBeNull();

    await pressedIn(doc, pressing('Escape'));

    expect([liftButton(), heardOnTheHost.length]).toEqual([null, 0]);
  });

  it('carries out an Escape the chapter had no use for', async () => {
    const doc = await opened();

    await pressedIn(doc, pressing('Escape'));

    expect(heardOnTheHost.map((heard) => heard.key)).toEqual(['Escape']);
  });

  it('refuses the browser its own default once the host has taken the shortcut', async () => {
    const doc = await opened();
    const takes = (event: KeyboardEvent): void => event.preventDefault();
    window.addEventListener('keydown', takes);

    const pressed = await pressedIn(doc, pressing('k', { metaKey: true }));
    window.removeEventListener('keydown', takes);

    expect(pressed.defaultPrevented).toBe(true);
  });

  it('leaves an ordinary letter where it was typed', async () => {
    const doc = await opened();

    await pressedIn(doc, pressing('k'));

    expect(heardOnTheHost.length).toBe(0);
  });
});
