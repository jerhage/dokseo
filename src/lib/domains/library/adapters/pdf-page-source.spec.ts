import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import type { PageSource } from '$lib/shared/page-source';

const document = vi.hoisted(() => ({
  pages: 3,
  size: { width: 612.5, height: 792 },
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
    getViewport: () => document.size,
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
});
