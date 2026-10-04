import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import type { Container } from '$lib/container';
import { bookId, contentHash } from '$lib/shared/ids';
import { START_OF_THE_TEXT, textPlace } from '$lib/shared/reading-place';
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
<dc:identifier id="uid">urn:uuid:refresh</dc:identifier>
<dc:title>Refresh</dc:title><dc:language>ja</dc:language>
<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata>
<manifest>
<item id="one" href="chapter-1.xhtml" media-type="application/xhtml+xml"/>
</manifest>
<spine><itemref idref="one"/></spine></package>`;

const CHAPTER = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>ch</title></head>
<body><p>そして彼は漢字と言った。</p></body></html>`;

const OPENED_WITHIN_MS = 8000;

const SAVED_AT = 1758300000000;

async function epub(): Promise<Blob> {
  const zip = new ZipWriter(new BlobWriter('application/epub+zip'));
  await zip.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
  await zip.add('META-INF/container.xml', new TextReader(CONTAINER));
  await zip.add('OEBPS/content.opf', new TextReader(OPF));
  await zip.add('OEBPS/chapter-1.xhtml', new TextReader(CHAPTER));
  return zip.close();
}

function novel(): FlowBook {
  return {
    id: bookId('refresh'),
    title: 'Refresh',
    alias: null,
    seriesId: null,
    volume: null,
    language: 'ja',
    layoutKind: 'flow',
    direction: 'rtl',
    pagePairing: 'double-after-cover',
    pageFit: 'width',
    sourceKind: 'epub',
    contentHash: contentHash('r1'),
    fileName: 'book.epub',
    imageCount: 0,
    addedAt: 1758240000000,
    position: START_OF_THE_TEXT,
    lastReadAt: null,
    finishedAt: null,
  };
}

afterEach(() => {
  for (const view of document.querySelectorAll('foliate-view')) view.remove();
});

describe('FlowViewer given a refreshed record of the open book', () => {
  it('keeps the book open when the record keeps its id', async () => {
    const book = novel();
    const source = await epub();
    const readSource = vi.fn(() => Promise.resolve({ kind: 'success', source }));
    const container = {
      library: { readSource },
      flowing: { saveReadingSettings: () => Promise.resolve({ kind: 'success' }) },
    } as unknown as Container;
    const view = new FlowView(container, () => undefined, createTestQueryClient());
    const shown = render(FlowViewer, {
      view,
      book,
      storedSettings: DEFAULT_READING_SETTINGS,
      edgeClicksTurn: true,
    });
    await expect.poll(() => view.state.kind, { timeout: OPENED_WITHIN_MS }).toBe('ready');

    await shown.rerender({
      book: { ...book, position: textPlace('epubcfi(/6/2!/4/2/1:3)', 0.5), lastReadAt: SAVED_AT },
    });

    expect(view.state.kind).toBe('ready');
    expect(readSource).toHaveBeenCalledTimes(1);
  });
});
