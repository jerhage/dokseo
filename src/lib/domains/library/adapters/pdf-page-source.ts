import type * as PdfJs from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { ImageIndex } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { PagePicture, PageSource, PageSourceError } from '$lib/shared/page-source';
import { describeCause } from '$lib/shared/cause';
import { RANGE_CHUNK_BYTES, clampRange, initialChunkSize } from './pdf-ranges';
import { choosePdfBuild } from './pdf-build';
import type { PdfBuild } from './pdf-build';

const RENDER_SCALE = 2;

function defineBlobRangeTransport(base: typeof PdfJs.PDFDataRangeTransport) {
  return class BlobRangeTransport extends base {
    readonly failure: Promise<never>;
    #blob: Blob;
    #aborted = false;
    #reportFailure: (cause: unknown) => void = () => undefined;

    constructor(blob: Blob, initialData: Uint8Array) {
      super(blob.size, initialData, true);
      this.#blob = blob;
      this.failure = new Promise<never>((_resolve, reject) => {
        this.#reportFailure = reject;
      });
      this.failure.catch(() => undefined);
    }

    override requestDataRange(begin: number, end: number): void {
      void this.#serve(begin, end);
    }

    override abort(): void {
      this.#aborted = true;
    }

    async #serve(begin: number, end: number): Promise<void> {
      const range = clampRange(begin, end, this.#blob.size);
      try {
        const bytes = await this.#blob.slice(range.begin, range.end).arrayBuffer();
        if (this.#aborted) return;
        this.onDataRange(range.begin, new Uint8Array(bytes));
      } catch (cause) {
        this.#reportFailure(cause);
      }
    }
  };
}

type BlobRangeTransport = InstanceType<ReturnType<typeof defineBlobRangeTransport>>;

interface PdfJsRuntime {
  readonly getDocument: typeof PdfJs.getDocument;
  readonly BlobRangeTransport: ReturnType<typeof defineBlobRangeTransport>;
}

interface PdfJsBuildFiles {
  readonly library: Promise<typeof PdfJs>;
  readonly workerSrc: string;
}

function pdfJsBuildFiles(build: PdfBuild): PdfJsBuildFiles {
  if (build === 'modern') {
    return {
      library: import('pdfjs-dist'),
      workerSrc: new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href,
    };
  }
  return {
    library: import('pdfjs-dist/legacy/build/pdf.mjs'),
    workerSrc: new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href,
  };
}

async function loadPdfJsRuntime(): Promise<PdfJsRuntime> {
  const files = pdfJsBuildFiles(choosePdfBuild(globalThis));
  const pdfjs = await files.library;
  pdfjs.GlobalWorkerOptions.workerSrc = files.workerSrc;
  return {
    getDocument: pdfjs.getDocument,
    BlobRangeTransport: defineBlobRangeTransport(pdfjs.PDFDataRangeTransport),
  };
}

let runtime: Promise<PdfJsRuntime> | undefined;

function pdfJsRuntime(): Promise<PdfJsRuntime> {
  runtime ??= loadPdfJsRuntime().catch((cause: unknown) => {
    runtime = undefined;
    throw cause;
  });
  return runtime;
}

async function renderToBitmap(pdf: PDFDocumentProxy, pageNumber: number): Promise<ImageBitmap> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('A 2D drawing context was unavailable');
  await page.render({
    canvas: null,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  return canvas.transferToImageBitmap();
}

async function openPdfPageSource(source: Blob): Promise<Result<PageSource, PageSourceError>> {
  let task: PDFDocumentLoadingTask | undefined;
  let transport: BlobRangeTransport;
  let pdf: PDFDocumentProxy;
  try {
    const { getDocument, BlobRangeTransport } = await pdfJsRuntime();
    const head = await source.slice(0, initialChunkSize(source.size)).arrayBuffer();
    transport = new BlobRangeTransport(source, new Uint8Array(head));
    task = getDocument({
      range: transport,
      rangeChunkSize: RANGE_CHUNK_BYTES,
      disableAutoFetch: true,
      disableStream: true,
    });
    pdf = await Promise.race([task.promise, transport.failure]);
  } catch (cause) {
    void task?.destroy().catch(() => undefined);
    return err({ kind: 'source-unreadable', cause: describeCause(cause) });
  }

  const loading = task;
  const count = pdf.numPages;
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    void loading.destroy().catch(() => undefined);
  };

  const render = async (index: ImageIndex): Promise<Result<ImageBitmap, PageSourceError>> => {
    if (closed) return err({ kind: 'source-unreadable', cause: 'The document is closed' });
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      return err({ kind: 'out-of-range', index, count });
    }
    try {
      const bitmap = await Promise.race([renderToBitmap(pdf, index + 1), transport.failure]);
      return ok(bitmap);
    } catch (cause) {
      return err({ kind: 'render-failed', index, cause: describeCause(cause) });
    }
  };

  return ok({
    count,

    async picture(index: ImageIndex): Promise<Result<PagePicture, PageSourceError>> {
      const drawn = await render(index);
      if (!drawn.ok) return drawn;
      return ok({ kind: 'drawn', bitmap: drawn.value });
    },

    image: render,

    close,
    [Symbol.dispose]: close,
  });
}

export { openPdfPageSource };
