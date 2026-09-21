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
}));

vi.mock('pdfjs-dist', () => {
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
    GlobalWorkerOptions: {},
    PDFDataRangeTransport: FakeTransport,
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: document.pages,
        getPage: (number: number) => Promise.resolve(page(number)),
      }),
      destroy: () => Promise.resolve(),
    }),
  };
});

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
  if (!source.ok) throw new Error('the document could not be opened');
  return source.value;
}

beforeEach(() => {
  document.rendered = [];
  document.size = PORTRAIT;
  document.failRender = false;
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
      ok: true,
      value: { kind: 'drawn', bitmap: expect.objectContaining({ width: 613, height: 792 }) },
    });
    expect(document.rendered).toEqual([2]);
  });

  it('rejects a picture outside the document', async () => {
    using source = await opened();

    const picture = await source.picture(imageIndex(9));

    expect(picture).toEqual({ ok: false, error: { kind: 'out-of-range', index: 9, count: 3 } });
    expect(document.rendered).toEqual([]);
  });

  it('rejects a picture once the document is closed', async () => {
    const source = await opened();
    source.close();

    const picture = await source.picture(imageIndex(0));

    expect(picture).toEqual({
      ok: false,
      error: { kind: 'source-unreadable', cause: 'The document is closed' },
    });
  });

  it('reports a render failure, not a decode failure, when a page will not draw', async () => {
    document.failRender = true;
    using source = await opened();

    const picture = await source.picture(imageIndex(0));

    expect(picture).toEqual({
      ok: false,
      error: {
        kind: 'render-failed',
        index: 0,
        cause: expect.stringContaining('the page is damaged'),
      },
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

    if (!picture.ok) throw new Error('the page did not draw');
    if (picture.value.kind !== 'drawn') throw new Error('the picture was not drawn');
    if (!image.ok) throw new Error('the page did not render');
    const expected = {
      width: Math.ceil(size.width * RENDER_SCALE),
      height: Math.ceil(size.height * RENDER_SCALE),
    };
    expect({ width: picture.value.bitmap.width, height: picture.value.bitmap.height }).toEqual(
      expected,
    );
    expect({ width: image.value.width, height: image.value.height }).toEqual(expected);
  });
});
