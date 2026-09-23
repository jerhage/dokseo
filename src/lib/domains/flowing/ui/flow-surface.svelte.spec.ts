import { afterEach, describe, expect, it } from 'vitest';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import { openFlowSurface } from './flow-surface';
import type { FlowSurface } from './flow-surface';

const CONTAINER = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

const NAV = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title></head>
<body><nav epub:type="toc"><ol>
<li><a href="cover.svg">Cover</a></li>
<li><a href="chapter-1.xhtml">One</a></li>
<li><a href="chapter-2.xhtml">Two</a></li>
</ol></nav></body></html>`;

const COVER = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
<rect width="600" height="800" fill="#eeeeee"/><text x="20" y="40">表紙</text></svg>`;

const SETTLES_WITHIN_MS = 8000;

const PENDING = 'pending';

function opf(spine: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">urn:uuid:probe</dc:identifier>
<dc:title>Probe</dc:title><dc:language>ja</dc:language>
<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="cover" href="cover.svg" media-type="image/svg+xml"/>
<item id="one" href="chapter-1.xhtml" media-type="application/xhtml+xml"/>
<item id="two" href="chapter-2.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine>${spine}</spine></package>`;
}

function chapter(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${text}</title></head>
<body><p>${text}</p></body></html>`;
}

async function bookWithAnSvgCover(spine: string): Promise<Blob> {
  const zip = new ZipWriter(new BlobWriter('application/epub+zip'));
  await zip.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
  await zip.add('META-INF/container.xml', new TextReader(CONTAINER));
  await zip.add('OEBPS/content.opf', new TextReader(opf(spine)));
  await zip.add('OEBPS/nav.xhtml', new TextReader(NAV));
  await zip.add('OEBPS/cover.svg', new TextReader(COVER));
  await zip.add('OEBPS/chapter-1.xhtml', new TextReader(chapter('第一章')));
  await zip.add('OEBPS/chapter-2.xhtml', new TextReader(chapter('第二章')));
  return zip.close();
}

async function settles(work: Promise<unknown>): Promise<string> {
  return Promise.race([
    work.then(
      () => 'resolved',
      (cause: unknown) => `rejected: ${String(cause)}`,
    ),
    new Promise<string>((done) => setTimeout(() => done(PENDING), SETTLES_WITHIN_MS)),
  ]);
}

const stages: HTMLElement[] = [];

const opened: FlowSurface[] = [];

function stage(): HTMLElement {
  const host = document.createElement('div');
  host.style.width = '600px';
  host.style.height = '800px';
  document.body.append(host);
  stages.push(host);
  return host;
}

function theOpenBook(): FlowSurface {
  const [surface] = opened;
  if (surface === undefined) throw new Error('no surface was opened');

  return surface;
}

async function show(host: HTMLElement, spine: string, at: string | null): Promise<string> {
  const source = await bookWithAnSvgCover(spine);
  const opening = openFlowSurface(
    host,
    { source, at, settings: DEFAULT_READING_SETTINGS, moved: () => undefined },
    () => undefined,
  ).then((surface) => {
    opened.push(surface);
  });

  return settles(opening);
}

async function nextFrame(): Promise<void> {
  return new Promise((drawn) => requestAnimationFrame(() => drawn()));
}

afterEach(async () => {
  await nextFrame();
  await nextFrame();
  for (const surface of opened.splice(0)) surface.destroy();
  for (const host of stages.splice(0)) host.remove();
});

describe('openFlowSurface over a book whose spine holds a standalone svg', () => {
  it('opens a book whose cover is a standalone svg', async () => {
    const host = stage();

    const outcome = await show(
      host,
      '<itemref idref="cover"/><itemref idref="one"/><itemref idref="two"/>',
      null,
    );

    expect(outcome).toBe('resolved');
  });

  it('turns the page past a standalone svg sitting between two chapters', async () => {
    const host = stage();

    const outcome = await show(
      host,
      '<itemref idref="one"/><itemref idref="cover"/><itemref idref="two"/>',
      null,
    );
    expect(outcome).toBe('resolved');

    const book = theOpenBook();
    const turned = await settles(Promise.resolve(book.pages.next()));
    const back = await settles(Promise.resolve(book.pages.prev()));

    expect([turned, back]).toEqual(['resolved', 'resolved']);
  });

  it('opens a book whose stored place sits inside a standalone svg', async () => {
    const host = stage();

    const outcome = await show(
      host,
      '<itemref idref="cover"/><itemref idref="one"/><itemref idref="two"/>',
      'epubcfi(/6/2!/4/1:0)',
    );

    expect(outcome).toBe('resolved');
  });
});
