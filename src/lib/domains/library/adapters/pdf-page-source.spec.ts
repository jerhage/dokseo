import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import type { PageSource } from '$lib/shared/page-source';

const PORTRAIT = { width: 306.25, height: 396 };

const LANDSCAPE_SPREAD = { width: 841.89, height: 297.64 };

const RENDER_SCALE = 2;

const document = vi.hoisted(() => ({
  pages: 3,
  size: { width: 306.25, height: 396 },
  rendered: [] as number[],
  failRender: false,
  metadata: (() => Promise.resolve({ info: {}, metadata: null })) as () => Promise<{
    info: unknown;
    metadata: { get: (name: string) => unknown } | null;
  }>,
}));

const pdfjs = vi.hoisted(() => {
  const openedBy: string[] = [];
  const fake = (build: string) => {
    class FakeTransport {
      onDataRange(): void {
        return undefined;
      }

      requestDataRange(): void {
        return undefined;
      }

      abort(): void {
        return undefined;
      }
    }

    const page = (number: number) => ({
      getViewport: ({ scale }: { scale: number }) => ({
        width: document.size.width * scale,
        height: document.size.height * scale,
      }),
      render: () => {
        document.rendered.push(number);
        return {
          promise: document.failRender
            ? Promise.reject(new Error('the page is damaged'))
            : Promise.resolve(),
        };
      },
    });

    return {
      GlobalWorkerOptions: { workerSrc: '' },
      PDFDataRangeTransport: FakeTransport,
      getDocument: () => {
        openedBy.push(build);
        return {
          promise: Promise.resolve({
            numPages: document.pages,
            getMetadata: () => document.metadata(),
            getPage: (number: number) => Promise.resolve(page(number)),
          }),
          destroy: () => Promise.resolve(),
        };
      },
    };
  };
  return {
    build: { chosen: 'modern' as 'modern' | 'legacy' },
    openedBy,
    modern: fake('modern'),
    legacy: fake('legacy'),
  };
});

vi.mock('pdfjs-dist', () => pdfjs.modern);

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => pdfjs.legacy);

vi.mock('./pdf-build', () => ({ choosePdfBuild: () => pdfjs.build.chosen }));

class FakeOffscreenCanvas {
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext(): object {
    return {};
  }

  transferToImageBitmap(): ImageBitmap {
    return {
      width: this.width,
      height: this.height,
      close: () => undefined,
    } as unknown as ImageBitmap;
  }
}

async function opened(): Promise<PageSource> {
  const { openPdfPageSource } = await import('./pdf-page-source');
  const source = await openPdfPageSource(new Blob(['%PDF-1.7 pretend bytes']));
  if (source.kind !== 'success') throw new Error('the document could not be opened');
  return source.pages;
}

beforeEach(() => {
  vi.resetModules();
  pdfjs.build.chosen = 'modern';
  pdfjs.openedBy.length = 0;
  pdfjs.modern.GlobalWorkerOptions.workerSrc = '';
  pdfjs.legacy.GlobalWorkerOptions.workerSrc = '';
  document.rendered = [];
  document.size = PORTRAIT;
  document.failRender = false;
  document.metadata = () => Promise.resolve({ info: {}, metadata: null });
  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openPdfPageSource', () => {
  it('draws a picture from the rendered page', async () => {
    using source = await opened();

    const picture = await source.picture(imageIndex(1));

    expect(picture).toEqual({
      kind: 'success',
      picture: { kind: 'drawn', bitmap: expect.objectContaining({ width: 613, height: 792 }) },
    });
    expect(document.rendered).toEqual([2]);
  });

  it('rejects a picture outside the document', async () => {
    using source = await opened();

    const picture = await source.picture(imageIndex(9));

    expect(picture).toEqual({ kind: 'out-of-range', index: 9, count: 3 });
    expect(document.rendered).toEqual([]);
  });

  it('rejects a picture once the document is closed', async () => {
    const source = await opened();
    source.close();

    const picture = await source.picture(imageIndex(0));

    expect(picture).toEqual({ kind: 'source-unreadable', cause: 'The document is closed' });
  });

  it('reports a render failure, not a decode failure, when a page will not draw', async () => {
    document.failRender = true;
    using source = await opened();

    const picture = await source.picture(imageIndex(0));

    expect(picture).toEqual({
      kind: 'render-failed',
      index: 0,
      cause: expect.stringContaining('the page is damaged'),
    });
  });

  const geometries = [
    { shape: 'portrait page', size: PORTRAIT },
    { shape: 'landscape spread', size: LANDSCAPE_SPREAD },
  ];

  it.each(geometries)('renders a $shape at one size for a picture and a crop', async ({ size }) => {
    document.size = size;
    using source = await opened();

    const picture = await source.picture(imageIndex(0));
    const image = await source.image(imageIndex(0));

    if (picture.kind !== 'success') throw new Error('the page did not draw');
    if (picture.picture.kind !== 'drawn') throw new Error('the picture was not drawn');
    if (image.kind !== 'success') throw new Error('the page did not render');
    const expected = {
      width: Math.ceil(size.width * RENDER_SCALE),
      height: Math.ceil(size.height * RENDER_SCALE),
    };
    expect({ width: picture.picture.bitmap.width, height: picture.picture.bitmap.height }).toEqual(
      expected,
    );
    expect({ width: image.image.width, height: image.image.height }).toEqual(expected);
  });

  it.each(geometries)(
    'sizes a $shape as its picture is drawn, without drawing it',
    async ({ size }) => {
      document.size = size;
      using source = await opened();

      const sizes = await source.sizes();
      const picture = await source.picture(imageIndex(0));

      if (sizes.kind !== 'success') throw new Error('the pages were not sized');
      if (picture.kind !== 'success' || picture.picture.kind !== 'drawn') {
        throw new Error('the page did not draw');
      }
      const drawn = { width: picture.picture.bitmap.width, height: picture.picture.bitmap.height };
      expect(sizes.sizes).toEqual([drawn, drawn, drawn]);
      expect(document.rendered).toEqual([1]);
    },
  );

  it('reports no sizes once the document is closed', async () => {
    const source = await opened();
    source.close();

    const sizes = await source.sizes();

    expect(sizes).toEqual({ kind: 'source-unreadable', cause: 'The document is closed' });
  });

  it.each([
    [
      'modern',
      'the browser has every API',
      'legacy',
      /^(?!.*legacy).*\/build\/pdf\.worker\.min\.mjs$/u,
    ],
    ['legacy', 'the browser lacks an API', 'modern', /\/legacy\/build\/pdf\.worker\.min\.mjs$/u],
  ] as const)(
    'opens the document with the %s build and its worker when %s',
    async (chosen, _, other, worker) => {
      pdfjs.build.chosen = chosen;
      using source = await opened();

      expect(source.count).toBe(3);

      expect(pdfjs.openedBy).toEqual([chosen]);
      expect(pdfjs[chosen].GlobalWorkerOptions.workerSrc).toMatch(worker);
      expect(pdfjs[other].GlobalWorkerOptions.workerSrc).toBe('');
    },
  );

  it('chooses the build once and keeps it for every later document', async () => {
    pdfjs.build.chosen = 'legacy';
    using first = await opened();
    pdfjs.build.chosen = 'modern';
    using second = await opened();

    expect([first.count, second.count]).toEqual([3, 3]);
    expect(pdfjs.openedBy).toEqual(['legacy', 'legacy']);
  });
});

function xmp(title: unknown) {
  return { get: (name: string) => (name === 'dc:title' ? title : undefined) };
}

async function bookTitled(): Promise<string | null> {
  const { openPdfBook } = await import('./pdf-page-source');
  const book = await openPdfBook(new Blob(['%PDF-1.7 pretend bytes']));
  if (book.kind !== 'success') throw new Error('the document could not be opened');
  book.pages.close();
  return book.metadataTitle;
}

describe('openPdfBook', () => {
  it('opens the pages beside the title in the info dictionary, trimmed', async () => {
    document.metadata = () =>
      Promise.resolve({ info: { Title: '  よつばと! 1 ' }, metadata: xmp('XMP title') });
    const { openPdfBook } = await import('./pdf-page-source');

    const book = await openPdfBook(new Blob(['%PDF-1.7 pretend bytes']));

    if (book.kind !== 'success') throw new Error('the document could not be opened');
    using pages = book.pages;
    expect(book.metadataTitle).toBe('よつばと! 1');
    expect(pages.count).toBe(3);
  });

  it.each([
    ['has no Title', {}],
    ['has an empty Title', { Title: '' }],
    ['has a blank Title', { Title: '   ' }],
    ['has a placeholder Title', { Title: 'Untitled' }],
    ['has a Title that is a file name', { Title: 'Microsoft Word - akira.doc' }],
    ['has a Title that is not text', { Title: 7 }],
  ])('falls back to the XMP dc:title when the info dictionary %s', async (_, info) => {
    document.metadata = () => Promise.resolve({ info, metadata: xmp('AKIRA 1') });

    expect(await bookTitled()).toBe('AKIRA 1');
  });

  it.each([
    ['carries no metadata at all', () => Promise.resolve({ info: {}, metadata: null })],
    [
      'carries only junk titles',
      () =>
        Promise.resolve({
          info: { Title: 'C:\\scans\\akira.indd' },
          metadata: xmp('/Users/jh/akira'),
        }),
    ],
    ['fails to read its metadata', () => Promise.reject(new Error('the trailer is damaged'))],
  ])('reports no title, and still opens, when the document %s', async (_, metadata) => {
    document.metadata = metadata;

    expect(await bookTitled()).toBeNull();
  });

  it('gives up on a metadata read that never answers, and still opens', async () => {
    vi.useFakeTimers();
    try {
      document.metadata = () => new Promise(() => undefined);
      const { METADATA_PATIENCE_MS } = await import('./pdf-page-source');

      const titled = bookTitled();
      await vi.advanceTimersByTimeAsync(METADATA_PATIENCE_MS);

      expect(await titled).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
