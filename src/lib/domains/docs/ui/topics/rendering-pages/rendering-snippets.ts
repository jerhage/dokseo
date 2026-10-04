import type { SourceSnippet } from '../ocr/ocr-snippets';

const DECODE_IMAGE: SourceSnippet = {
  label: 'Decoding a blob into a bitmap',
  file: 'src/lib/platform/image/decode.ts',
  code: `async function decodeImage(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch (cause) {`,
};

const PAGE_SOURCE_PORT: SourceSnippet = {
  label: 'The page source port',
  file: 'src/lib/shared/page-source.ts',
  code: `type PagePicture =
  | { readonly kind: 'encoded'; readonly url: string }
  | { readonly kind: 'drawn'; readonly bitmap: ImageBitmap };`,
};

const PAGE_SOURCE_INTERFACE: SourceSnippet = {
  label: 'One sequence of images',
  file: 'src/lib/shared/page-source.ts',
  code: `interface PageSource {
  readonly count: number;
  picture(index: ImageIndex): Promise<PictureRead>;
  image(index: ImageIndex): Promise<ImageRead>;
  sizes(): Promise<SizesRead>;
  close(): void;
  [Symbol.dispose](): void;
}`,
};

const ARCHIVE_PICTURE: SourceSnippet = {
  label: 'An archive page for display',
  file: 'src/lib/domains/library/adapters/archive-page-source.ts',
  code: `async picture(index: ImageIndex): Promise<PictureRead> {
  const found = entryAt(index);
  if (found.kind !== 'success') return found;
  try {
    const entry = await found.entry.getData(new BlobWriter());
    const url = URL.createObjectURL(entry);
    return { kind: 'success', picture: { kind: 'encoded', url } };
  } catch (cause) {
    return { kind: 'page-unreadable', index, cause: describeCause(cause) };
  }
},`,
};

const PACK_FOLDER: SourceSnippet = {
  label: 'Packing a folder into a stored ZIP',
  file: 'src/lib/domains/library/adapters/archive-packer.ts',
  code: `const writer = new ZipWriter(new BlobWriter('application/zip'));
try {
  report(0, images.length);
  for (const [position, file] of images.entries()) {
    await writer.add(entryName(file), new BlobReader(file), { level: 0 });
    report(position + 1, images.length);
  }`,
};

const PDF_RENDER: SourceSnippet = {
  label: 'Rendering a PDF page to a bitmap',
  file: 'src/lib/domains/library/adapters/pdf-page-source.ts',
  code: `async function renderToBitmap(pdf: PDFDocumentProxy, pageNumber: number): Promise<ImageBitmap> {
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
}`,
};

const PDF_OPEN: SourceSnippet = {
  label: 'Opening a PDF by byte range',
  file: 'src/lib/domains/library/adapters/pdf-page-source.ts',
  code: `const head = await source.slice(0, initialChunkSize(source.size)).arrayBuffer();
const transport = new BlobRangeTransport(source, new Uint8Array(head));
task = getDocument({
  range: transport,
  rangeChunkSize: RANGE_CHUNK_BYTES,
  disableAutoFetch: true,
  disableStream: true,
});`,
};

const PDF_RUNTIME: SourceSnippet = {
  label: 'Loading the chosen pdf.js build once',
  file: 'src/lib/domains/library/adapters/pdf-page-source.ts',
  code: `async function loadPdfJsRuntime(): Promise<PdfJsRuntime> {
  const files = pdfJsBuildFiles(choosePdfBuild(globalThis));
  const pdfjs = await files.library;
  pdfjs.GlobalWorkerOptions.workerSrc = files.workerSrc;
  return {
    getDocument: pdfjs.getDocument,
    BlobRangeTransport: defineBlobRangeTransport(pdfjs.PDFDataRangeTransport),
  };
}`,
};

const PDF_BUILD_CHOICE: SourceSnippet = {
  label: 'Choosing the build by feature detection',
  file: 'src/lib/domains/library/adapters/pdf-build.ts',
  code: `function choosePdfBuild(globals: object): PdfBuild {
  const complete = MODERN_BUILD_REQUIREMENTS.every(
    (path) => typeof lookup(globals, path) === 'function',
  );
  return complete ? 'modern' : 'legacy';
}`,
};

const RELEASE_PICTURE: SourceSnippet = {
  label: 'Releasing a picture',
  file: 'src/lib/platform/image/bitmap.ts',
  code: `function releasePicture(picture: PagePicture): void {
  if (picture.kind === 'encoded') {
    URL.revokeObjectURL(picture.url);
    return;
  }

  picture.bitmap.close();
}`,
};

const FRAME_LOAD: SourceSnippet = {
  label: 'A page frame owns the picture it loaded',
  file: 'src/lib/domains/viewing/ui/PageFrame.svelte',
  code: `void (async () => {
  const got = await untrack(() => pictureAt(wanted));
  if (!live) {
    if (got !== null) releasePicture(got);
    return;
  }
  if (got === null) {
    phase = 'failed';
    return;
  }

  held = got;
  picture = got;
})();

return () => {
  live = false;
  picture = null;
  if (held !== null) releasePicture(held);
};`,
};

const FRAME_DRAW: SourceSnippet = {
  label: 'Transferring a drawn page into its canvas',
  file: 'src/lib/domains/viewing/ui/PageFrame.svelte',
  code: `const size = { width: drawn.bitmap.width, height: drawn.bitmap.height };
canvas.width = size.width;
canvas.height = size.height;
context.transferFromImageBitmap(drawn.bitmap);
show(size);`,
};

const STRIP_REACH: SourceSnippet = {
  label: "The strip window's reach",
  file: 'src/lib/domains/viewing/domain/strip.ts',
  code: `const AHEAD_SCREENS = 3;

const BEHIND_SCREENS = 1;

const MOST_SLICES = 8;`,
};

const DEVICE_PIXEL_SNAP: SourceSnippet = {
  label: 'Snapping slice edges to device pixels',
  file: 'src/lib/domains/viewing/ui/ContinuousViewer.svelte',
  code: `function snapToDevicePixels(value: number): number {
  const ratio = window.devicePixelRatio;
  if (!Number.isFinite(ratio) || ratio <= 0) return value;
  return Math.round(value * ratio) / ratio;
}`,
};

const PAIR_PAGES: SourceSnippet = {
  label: 'Pairing pages into groups',
  file: 'src/lib/domains/viewing/domain/page-pairing.ts',
  code: `function pairPages(sizes: readonly (Size | null)[], pairing: PagePairing): readonly PageGroup[] {
  if (sizes.length === 0) return [];

  return match(pairing)
    .with('single', () => singles(sizes.length))
    .with('double', () => pairsFrom(sizes, 0))
    .with('double-after-cover', () => [[imageIndex(0)], ...pairsFrom(sizes, 1)])
    .exhaustive();
}`,
};

const EFFECTIVE_PAIRING: SourceSnippet = {
  label: 'What automatic pairing means',
  file: 'src/lib/shared/layout-kind.ts',
  code: `function automaticPairing(screen: ScreenWidth): PagePairing {
  return screen === 'narrow' ? 'single' : 'double-after-cover';
}

function effectivePairing(
  pairing: PagePairingChoice,
  layoutKind: ImageLayoutKind,
  screen: ScreenWidth,
): PagePairing {
  if (layoutKind === 'continuous') return 'single';
  return pairing === 'auto' ? automaticPairing(screen) : pairing;
}`,
};

const COVER_THUMBNAIL: SourceSnippet = {
  label: 'Drawing the cover from the first image',
  file: 'src/lib/domains/library/adapters/file-source-builder.ts',
  code: `const first = await pages.image(imageIndex(0));
if (first.kind !== 'success') return unreadablePages(first);

let cover: Blob;
try {
  cover = await renderThumbnail(first.image, COVER_MAX_WIDTH);
} finally {
  first.image.close();
}`,
};

const CHOSEN_FILES: SourceSnippet = {
  label: 'Copying the chosen files before clearing the input',
  file: 'src/lib/components/Dropzone.svelte',
  code: `function choose(event: Event & { currentTarget: HTMLInputElement }): void {
  const input = event.currentTarget;
  const chosen = input.files === null ? [] : [...input.files];
  input.value = '';
  report(chosen);
}`,
};

const RENDERING_SNIPPETS: readonly SourceSnippet[] = [
  DECODE_IMAGE,
  PAGE_SOURCE_PORT,
  PAGE_SOURCE_INTERFACE,
  ARCHIVE_PICTURE,
  PACK_FOLDER,
  PDF_RENDER,
  PDF_OPEN,
  PDF_RUNTIME,
  PDF_BUILD_CHOICE,
  RELEASE_PICTURE,
  FRAME_LOAD,
  FRAME_DRAW,
  STRIP_REACH,
  DEVICE_PIXEL_SNAP,
  PAIR_PAGES,
  EFFECTIVE_PAIRING,
  COVER_THUMBNAIL,
  CHOSEN_FILES,
];

export {
  ARCHIVE_PICTURE,
  CHOSEN_FILES,
  COVER_THUMBNAIL,
  DECODE_IMAGE,
  DEVICE_PIXEL_SNAP,
  EFFECTIVE_PAIRING,
  FRAME_DRAW,
  FRAME_LOAD,
  PACK_FOLDER,
  PAGE_SOURCE_INTERFACE,
  PAGE_SOURCE_PORT,
  PAIR_PAGES,
  PDF_BUILD_CHOICE,
  PDF_OPEN,
  PDF_RENDER,
  PDF_RUNTIME,
  RELEASE_PICTURE,
  RENDERING_SNIPPETS,
  STRIP_REACH,
};
