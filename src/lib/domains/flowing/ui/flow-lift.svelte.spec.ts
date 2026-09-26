import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import type { Container } from '$lib/container';
import { bookId, contentHash } from '$lib/shared/ids';
import { START_OF_THE_TEXT } from '$lib/shared/reading-place';
import { ok } from '$lib/shared/result';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import '$lib/styles/index.css';
import FlowViewer from './FlowViewer.svelte';
import { FlowView } from './flow-view.svelte';
import type { FlowBook } from './flow-view.svelte';
import type { LiftedPassage } from './flow-lift';

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
<dc:identifier id="uid">urn:uuid:lifts</dc:identifier>
<dc:title>Lifts</dc:title><dc:language>ja</dc:language>
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

function chapter(): string {
  const words = Array.from(
    { length: WORDS_PER_CHAPTER },
    (_unused, n) => `<span>言葉${n}</span>`,
  ).join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>ch</title></head>
<body><p id="first">そして彼は<span id="word"><ruby>漢字<rt>かんじ</rt></ruby></span>と言った。</p>
<p id="second">海が見える。</p>
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
    id: bookId('lifts'),
    title: 'Lifts',
    language: 'ja',
    layoutKind: 'flow',
    direction: 'rtl',
    pagePairing: 'double-after-cover',
    pageFit: 'width',
    sourceKind: 'epub',
    contentHash: contentHash('l1'),
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
      readSource: () => Promise.resolve(ok(source)),
      saveReadingPlace: () => Promise.resolve(ok(book)),
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

function chapterDoc(): Document {
  const [showing] = paginator().getContents();
  if (showing === undefined) throw new Error('no chapter is laid out');

  return showing.doc;
}

function liftButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('.lift button');
}

function pointer(kind: string, x: number, buttons: number): PointerEvent {
  return new PointerEvent(kind, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: 200,
    pointerId: 9,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons,
  });
}

function frameBox(doc: Document): DOMRect {
  const frame = doc.defaultView?.frameElement;
  if (frame === null || frame === undefined) throw new Error('the chapter frame is nowhere');

  return frame.getBoundingClientRect();
}

const CLEAR_OF_THE_TOP_BAR_PX = 70;

function wordTheReaderCanSee(doc: Document): Element {
  const page = stage().getBoundingClientRect();
  const origin = frameBox(doc);

  for (const span of doc.querySelectorAll('p > span')) {
    const box = span.getBoundingClientRect();
    const left = box.left + origin.left;
    const top = box.top + origin.top;
    if (
      left > page.left + CLEAR_OF_THE_TOP_BAR_PX &&
      box.right + origin.left < page.right - CLEAR_OF_THE_TOP_BAR_PX &&
      top > page.top + CLEAR_OF_THE_TOP_BAR_PX &&
      box.bottom + origin.top < page.bottom - CLEAR_OF_THE_TOP_BAR_PX
    ) {
      return span;
    }
  }

  throw new Error('no word of the chapter is on the page');
}

function elementIn(doc: Document, id: string): Element {
  const found = doc.getElementById(id);
  if (found === null) throw new Error(`the chapter has no element called ${id}`);

  return found;
}

function selects(doc: Document, range: Range): void {
  const selection = doc.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function overOneWord(doc: Document): Range {
  const range = doc.createRange();
  range.selectNodeContents(elementIn(doc, 'word'));
  return range;
}

function acrossTwoParagraphs(doc: Document): Range {
  const range = doc.createRange();
  range.setStartBefore(elementIn(doc, 'first').firstChild ?? elementIn(doc, 'first'));
  range.setEndAfter(elementIn(doc, 'second'));
  return range;
}

function forgets(doc: Document): void {
  doc.getSelection()?.removeAllRanges();
}

function buttonLeft(): number | null {
  const box = liftButton()?.getBoundingClientRect();
  return box === undefined ? null : Math.round(box.left);
}

async function releasesOver(doc: Document, range: Range): Promise<void> {
  doc.body.dispatchEvent(pointer('pointerdown', 40, 1));
  selects(doc, range);
  doc.body.dispatchEvent(pointer('pointerup', 40, 0));
  await rests();
}

const lifted: LiftedPassage[] = [];

async function opened(): Promise<Document> {
  const book = novel();
  const source = await epub();
  render(FlowViewer, {
    view: new FlowView(shelf(source, book)),
    book,
    onLift: (passage: LiftedPassage) => {
      lifted.push(passage);
    },
  });

  await expect.poll(() => paginator().pages, { timeout: LAID_OUT_WITHIN_MS }).toBeGreaterThan(2);
  await rests();

  return chapterDoc();
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

afterEach(() => {
  lifted.length = 0;
  for (const view of document.querySelectorAll('foliate-view')) view.remove();
});

describe('a selection in a flow chapter', () => {
  it('offers a button standing over the page the reader is looking at', async () => {
    const doc = await opened();

    await releasesOver(doc, overOneWord(doc));

    const button = liftButton();
    expect(button).not.toBeNull();

    const spot = button?.getBoundingClientRect();
    const page = stage().getBoundingClientRect();
    expect(spot === undefined ? null : spot.left >= page.left - 1).toBe(true);
    expect(spot === undefined ? null : spot.right <= page.right + 1).toBe(true);
    expect(spot === undefined ? null : spot.top >= page.top - 1).toBe(true);
    expect(spot === undefined ? null : spot.bottom <= page.bottom + 1).toBe(true);
  });

  it('reports the passage with its cfi and the text around it when the button is pressed', async () => {
    const doc = await opened();
    await releasesOver(doc, overOneWord(doc));

    liftButton()?.click();
    await rests();

    const passage = lifted[0];
    expect(passage?.quote.exact).toBe('漢字');
    expect(passage?.quote.prefix).toBe('そして彼は');
    expect(passage?.quote.suffix.startsWith('と言った。')).toBe(true);
    expect(passage?.cfi.startsWith('epubcfi(')).toBe(true);
  });

  it('leaves the reading out of the text it lifts from a ruby', async () => {
    const doc = await opened();
    await releasesOver(doc, overOneWord(doc));

    liftButton()?.click();
    await rests();

    expect(lifted[0]?.quote.exact).not.toContain('かんじ');
  });

  it('lifts a passage the reader dragged across two paragraphs', async () => {
    const doc = await opened();
    await releasesOver(doc, acrossTwoParagraphs(doc));

    liftButton()?.click();
    await rests();

    const exact = lifted[0]?.quote.exact ?? '';
    expect(exact).toContain('そして彼は');
    expect(exact).toContain('海が見える。');
  });

  it('takes the selection away once the passage is saved, so a tap turns the page again', async () => {
    const doc = await opened();
    await releasesOver(doc, overOneWord(doc));
    liftButton()?.click();
    await rests();
    const settled = paginator().page;

    const left = doc.getSelection()?.isCollapsed ?? true;
    await tap(0.1);

    expect([left, liftButton(), paginator().page > settled]).toEqual([true, null, true]);
  });

  it('stands over the word the reader selected, pages into a scrolled chapter', async () => {
    await opened();
    await tap(0.1);
    await tap(0.1);
    await tap(0.1);

    const word = wordTheReaderCanSee(chapterDoc());
    const range = chapterDoc().createRange();
    range.selectNodeContents(word);
    await releasesOver(chapterDoc(), range);

    const origin = frameBox(chapterDoc());
    const box = word.getBoundingClientRect();
    const middle = (box.left + box.right) / 2 + origin.left;
    const button = liftButton()?.getBoundingClientRect();

    expect(Math.abs(origin.left)).toBeGreaterThan(100);
    expect(
      button === undefined ? null : Math.abs((button.left + button.right) / 2 - middle) < 2,
    ).toBe(true);
  });

  it('takes the offer away when the reader presses somewhere else', async () => {
    const doc = await opened();
    await releasesOver(doc, overOneWord(doc));
    expect(liftButton()).not.toBeNull();

    doc.body.dispatchEvent(pointer('pointerdown', 300, 1));
    await rests();

    expect([liftButton(), lifted.length]).toEqual([null, 0]);
  });

  it('offers the button for a selection nobody dragged, with no pointer released', async () => {
    const doc = await opened();

    selects(doc, overOneWord(doc));
    await rests();

    expect(liftButton()).not.toBeNull();
  });

  it('follows the selection as it grows, without waiting for a pointer', async () => {
    const doc = await opened();

    selects(doc, overOneWord(doc));
    await rests();
    const word = buttonLeft();

    selects(doc, acrossTwoParagraphs(doc));
    await rests();
    const paragraphs = buttonLeft();

    expect([word, paragraphs].every((at) => at !== null)).toBe(true);
    expect(word).not.toBe(paragraphs);
  });

  it('lifts the passage the selection grew into, not the one it started as', async () => {
    const doc = await opened();

    selects(doc, overOneWord(doc));
    await rests();
    selects(doc, acrossTwoParagraphs(doc));
    await rests();

    liftButton()?.click();
    await rests();

    expect(lifted[0]?.quote.exact).toContain('海が見える。');
  });

  it('takes the button away when the selection collapses under it', async () => {
    const doc = await opened();
    await releasesOver(doc, overOneWord(doc));
    expect(liftButton()).not.toBeNull();

    forgets(doc);
    await rests();

    expect(liftButton()).toBeNull();
  });

  it('lifts nothing when the selection has gone before the button is pressed', async () => {
    const doc = await opened();
    await releasesOver(doc, overOneWord(doc));
    const standing = liftButton();

    forgets(doc);
    standing?.click();
    await rests();

    expect([lifted.length, liftButton()]).toEqual([0, null]);
  });

  it('stands no button up while the pointer is still drawing the selection out', async () => {
    const doc = await opened();

    doc.body.dispatchEvent(pointer('pointerdown', 40, 1));
    selects(doc, overOneWord(doc));
    await rests();
    const dragging = liftButton();

    doc.body.dispatchEvent(pointer('pointerup', 40, 0));
    await rests();

    expect([dragging, liftButton() !== null]).toEqual([null, true]);
  });

  it('offers the button again for a selection the reader extends with the keyboard', async () => {
    const doc = await opened();
    await tap(0.5);
    selects(doc, overOneWord(doc));
    await rests();
    const word = doc.getSelection()?.toString() ?? '';

    await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}');
    await rests();

    const grown = doc.getSelection()?.toString() ?? '';
    expect(grown.length).toBeGreaterThan(word.length);
    expect(liftButton()).not.toBeNull();
  });

  it('offers nothing for a release that left no selection behind', async () => {
    const doc = await opened();

    doc.body.dispatchEvent(pointer('pointerdown', 40, 1));
    doc.body.dispatchEvent(pointer('pointerup', 40, 0));
    await rests();

    expect(liftButton()).toBeNull();
  });
});
