import { afterEach, describe, expect, it } from 'vitest';
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

const WORDS_PER_CHAPTER = 900;

const SETTLES_MS = 400;

const LAID_OUT_WITHIN_MS = 8000;

function opf(direction: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">urn:uuid:taps</dc:identifier>
<dc:title>Taps</dc:title><dc:language>ja</dc:language>
<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="one" href="chapter-1.xhtml" media-type="application/xhtml+xml"/>
<item id="two" href="chapter-2.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine page-progression-direction="${direction}"><itemref idref="one"/><itemref idref="two"/></spine></package>`;
}

function chapter(mode: string): string {
  const words = Array.from(
    { length: WORDS_PER_CHAPTER },
    (_unused, n) => `<span>言葉${n}</span>`,
  ).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>ch</title>
<style>html { writing-mode: ${mode}; }</style></head>
<body><p>${words}</p></body></html>`;
}

async function epub(direction: string, mode: string): Promise<Blob> {
  const zip = new ZipWriter(new BlobWriter('application/epub+zip'));
  await zip.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
  await zip.add('META-INF/container.xml', new TextReader(CONTAINER));
  await zip.add('OEBPS/content.opf', new TextReader(opf(direction)));
  await zip.add('OEBPS/nav.xhtml', new TextReader(NAV));
  await zip.add('OEBPS/chapter-1.xhtml', new TextReader(chapter(mode)));
  await zip.add('OEBPS/chapter-2.xhtml', new TextReader(chapter(mode)));
  return zip.close();
}

function novel(direction: 'ltr' | 'rtl'): FlowBook {
  return {
    id: bookId('taps'),
    title: 'Taps',
    language: 'ja',
    layoutKind: 'flow',
    direction,
    pagePairing: 'double-after-cover',
    pageFit: 'width',
    sourceKind: 'epub',
    contentHash: contentHash('t1'),
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

function stage(): HTMLElement {
  const found = document.querySelector<HTMLElement>('.stage');
  if (found === null) throw new Error('the flow stage was never rendered');

  return found;
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

function chromeHushed(): boolean {
  return document.querySelector('header.bar.top')?.classList.contains('hushed') ?? false;
}

function chapterDoc(): Document {
  const [showing] = paginator().getContents();
  if (showing === undefined) throw new Error('no chapter is laid out');

  return showing.doc;
}

function frameX(doc: Document, share: number): number {
  const box = stage().getBoundingClientRect();
  const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
  if (frame === undefined) throw new Error('the chapter frame is nowhere');

  return box.left + box.width * share - frame.left;
}

function pointer(kind: string, x: number, buttons: number): PointerEvent {
  return new PointerEvent(kind, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: 300,
    pointerId: 7,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons,
  });
}

function selectTheChapter(doc: Document): void {
  const selection = doc.getSelection();
  const range = doc.createRange();
  range.selectNodeContents(doc.body);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

async function tap(share: number): Promise<void> {
  const host = stage();
  const box = host.getBoundingClientRect();
  await userEvent.click(host, {
    position: { x: Math.round(box.width * share), y: Math.round(box.height / 2) },
    force: true,
  });
  await rests();
}

async function opened(direction: 'ltr' | 'rtl', mode: string): Promise<Document> {
  const book = novel(direction);
  const source = await epub(direction, mode);
  render(FlowViewer, { view: new FlowView(shelf(source, book)), book });

  await expect.poll(() => paginator().pages, { timeout: LAID_OUT_WITHIN_MS }).toBeGreaterThan(2);
  await rests();

  return chapterDoc();
}

async function readWith(
  direction: 'ltr' | 'rtl',
  mode: string,
  shares: readonly number[],
): Promise<readonly string[]> {
  await opened(direction, mode);

  const afterTaps: string[] = [];
  for (const share of shares) {
    const before = paginator().page;
    const hushedBefore = chromeHushed();
    await tap(share);
    const moved = paginator().page - before;
    const toggled = chromeHushed() !== hushedBefore;
    const turned = moved > 0 ? 'forward' : moved < 0 ? 'back' : 'still';
    afterTaps.push(`${share}:${turned}${toggled ? '+chrome' : ''}`);
  }

  return afterTaps;
}

afterEach(() => {
  for (const view of document.querySelectorAll('foliate-view')) view.remove();
});

describe('a tap in a flow chapter', () => {
  it('turns a left-to-right book forward on the far quarter and back on the near one', async () => {
    const reading = await readWith('ltr', 'horizontal-tb', [0.9, 0.5, 0.1]);

    expect(reading).toEqual(['0.9:forward', '0.5:still+chrome', '0.1:back']);
  });

  it('turns a right-to-left book forward on the near quarter and back on the far one', async () => {
    const reading = await readWith('rtl', 'horizontal-tb', [0.1, 0.5, 0.9]);

    expect(reading).toEqual(['0.1:forward', '0.5:still+chrome', '0.9:back']);
  });

  it('reads the same three regions across a vertically set book', async () => {
    const reading = await readWith('rtl', 'vertical-rl', [0.1, 0.5, 0.9]);

    expect(reading).toEqual(['0.1:forward', '0.5:still+chrome', '0.9:back']);
  });

  it('turns nothing when the pointer comes up on an edge with the chapter selected', async () => {
    const doc = await opened('ltr', 'horizontal-tb');
    const settled = paginator().page;
    const far = frameX(doc, 0.9);

    doc.body.dispatchEvent(pointer('pointerdown', far, 1));
    selectTheChapter(doc);
    doc.body.dispatchEvent(pointer('pointerup', far, 0));
    await rests();

    expect([paginator().page, chromeHushed()]).toEqual([settled, false]);
  });

  it('turns nothing when the pointer travelled across the page before coming up', async () => {
    const doc = await opened('ltr', 'horizontal-tb');
    const settled = paginator().page;

    doc.body.dispatchEvent(pointer('pointerdown', frameX(doc, 0.2), 1));
    doc.body.dispatchEvent(pointer('pointerup', frameX(doc, 0.9), 0));
    await rests();

    expect([paginator().page, chromeHushed()]).toEqual([settled, false]);
  });
});
