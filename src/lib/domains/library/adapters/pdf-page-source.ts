import { GlobalWorkerOptions, PDFDataRangeTransport, getDocument } from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { ImageIndex } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import { describeCause } from '$lib/shared/cause';
import { RANGE_CHUNK_BYTES, clampRange, initialChunkSize } from './pdf-ranges';

const RENDER_SCALE = 2;

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

class BlobRangeTransport extends PDFDataRangeTransport {
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

  return ok({
    count,

    async image(index: ImageIndex): Promise<Result<ImageBitmap, PageSourceError>> {
      if (closed) return err({ kind: 'source-unreadable', cause: 'The document is closed' });
      if (!Number.isInteger(index) || index < 0 || index >= count) {
        return err({ kind: 'out-of-range', index, count });
      }
      try {
        const bitmap = await Promise.race([renderToBitmap(pdf, index + 1), transport.failure]);
        return ok(bitmap);
      } catch (cause) {
        return err({ kind: 'decode-failed', index, cause: describeCause(cause) });
      }
    },

    close,
    [Symbol.dispose]: close,
  });
}

export { openPdfPageSource };
