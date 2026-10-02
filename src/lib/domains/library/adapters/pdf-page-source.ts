import type * as PdfJs from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PageViewport } from 'pdfjs-dist';
import type { Size } from '$lib/shared/geometry';
import type { ImageIndex } from '$lib/shared/ids';
import type {
  ImageRead,
  PageSource,
  PageSourceError,
  PageSourceOpening,
  PictureRead,
  SizesRead,
} from '$lib/shared/page-source';
import { describeCause } from '$lib/shared/cause';
import { RANGE_CHUNK_BYTES, clampRange, initialChunkSize } from './pdf-ranges';
import { choosePdfBuild } from './pdf-build';
import type { PdfBuild } from './pdf-build';
import { plausibleTitle } from '../domain/book/title';

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

function drawnSize(viewport: PageViewport): Size {
  return { width: Math.ceil(viewport.width), height: Math.ceil(viewport.height) };
}

async function pageSizes(pdf: PDFDocumentProxy): Promise<readonly Size[]> {
  const sizes: Size[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    sizes.push(drawnSize(page.getViewport({ scale: RENDER_SCALE })));
  }
  return sizes;
}

async function renderToBitmap(pdf: PDFDocumentProxy, pageNumber: number): Promise<ImageBitmap> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const size = drawnSize(viewport);
  const canvas = new OffscreenCanvas(size.width, size.height);
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('A 2D drawing context was unavailable');
  await page.render({
    canvas: null,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  return canvas.transferToImageBitmap();
}

type OpenedPdf = {
  readonly task: PDFDocumentLoadingTask;
  readonly transport: BlobRangeTransport;
  readonly pdf: PDFDocumentProxy;
};

type PdfOpening = { readonly kind: 'success'; readonly opened: OpenedPdf } | PageSourceError;

type PdfBookOpening =
  | {
      readonly kind: 'success';
      readonly pages: PageSource;
      readonly metadataTitle: string | null;
    }
  | PageSourceError;

type PdfMetadata = Awaited<ReturnType<PDFDocumentProxy['getMetadata']>>;

const METADATA_PATIENCE_MS = 3000;

async function openPdfDocument(source: Blob): Promise<PdfOpening> {
  let task: PDFDocumentLoadingTask | undefined;
  try {
    const { getDocument, BlobRangeTransport } = await pdfJsRuntime();
    const head = await source.slice(0, initialChunkSize(source.size)).arrayBuffer();
    const transport = new BlobRangeTransport(source, new Uint8Array(head));
    task = getDocument({
      range: transport,
      rangeChunkSize: RANGE_CHUNK_BYTES,
      disableAutoFetch: true,
      disableStream: true,
    });
    const pdf = await Promise.race([task.promise, transport.failure]);
    return { kind: 'success', opened: { task, transport, pdf } };
  } catch (cause) {
    void task?.destroy().catch(() => undefined);
    return { kind: 'source-unreadable', cause: describeCause(cause) };
  }
}

function infoTitle(info: unknown): unknown {
  if (typeof info !== 'object' || info === null) return null;
  return Reflect.get(info, 'Title');
}

function xmpTitle(metadata: PdfMetadata['metadata'] | null): unknown {
  if (metadata === null) return null;
  return metadata.get('dc:title');
}

function firstPlausibleTitle(candidates: readonly unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const title = plausibleTitle(candidate);
    if (title !== null) return title;
  }
  return null;
}

async function readMetadataTitle(opened: OpenedPdf): Promise<string | null> {
  let patience: ReturnType<typeof setTimeout> | undefined;
  const outwaited = new Promise<null>((resolve) => {
    patience = setTimeout(() => resolve(null), METADATA_PATIENCE_MS);
  });
  try {
    const read = await Promise.race([
      opened.pdf.getMetadata(),
      opened.transport.failure,
      outwaited,
    ]);
    if (read === null) return null;
    return firstPlausibleTitle([infoTitle(read.info), xmpTitle(read.metadata)]);
  } catch {
    return null;
  } finally {
    clearTimeout(patience);
  }
}

function pdfPageSource({ task, transport, pdf }: OpenedPdf): PageSource {
  const count = pdf.numPages;
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    void task.destroy().catch(() => undefined);
  };

  const render = async (index: ImageIndex): Promise<ImageRead> => {
    if (closed) return { kind: 'source-unreadable', cause: 'The document is closed' };
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      return { kind: 'out-of-range', index, count };
    }
    try {
      const bitmap = await Promise.race([renderToBitmap(pdf, index + 1), transport.failure]);
      return { kind: 'success', image: bitmap };
    } catch (cause) {
      return { kind: 'render-failed', index, cause: describeCause(cause) };
    }
  };

  return {
    count,

    async picture(index: ImageIndex): Promise<PictureRead> {
      const drawn = await render(index);
      if (drawn.kind !== 'success') return drawn;
      return { kind: 'success', picture: { kind: 'drawn', bitmap: drawn.image } };
    },

    image: render,

    async sizes(): Promise<SizesRead> {
      if (closed) return { kind: 'source-unreadable', cause: 'The document is closed' };
      try {
        const sizes = await Promise.race([pageSizes(pdf), transport.failure]);
        return { kind: 'success', sizes };
      } catch (cause) {
        return { kind: 'source-unreadable', cause: describeCause(cause) };
      }
    },

    close,
    [Symbol.dispose]: close,
  };
}

async function openPdfPageSource(source: Blob): Promise<PageSourceOpening> {
  const opening = await openPdfDocument(source);
  if (opening.kind !== 'success') return opening;
  return { kind: 'success', pages: pdfPageSource(opening.opened) };
}

async function openPdfBook(source: Blob): Promise<PdfBookOpening> {
  const opening = await openPdfDocument(source);
  if (opening.kind !== 'success') return opening;
  const metadataTitle = await readMetadataTitle(opening.opened);
  return { kind: 'success', pages: pdfPageSource(opening.opened), metadataTitle };
}

export { METADATA_PATIENCE_MS, openPdfBook, openPdfPageSource };
export type { PdfBookOpening };
