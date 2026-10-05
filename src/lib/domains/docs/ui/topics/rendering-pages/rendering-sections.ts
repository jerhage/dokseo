import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { EPUB_SECTIONS } from '../epub-rendering/epub-sections';
import { OCR_SECTIONS } from '../ocr/ocr-sections';
import { STORAGE_SECTIONS } from '../storage/storage-sections';

const RENDERING_SECTIONS = {
  pipeline: 'From a book file to pixels',
  decode: 'Encoded bytes and decoded pixels',
  surfaces: 'An img element or a canvas',
  objectUrls: 'Object URLs',
  scale: 'Device pixels and render scale',
  offscreen: 'OffscreenCanvas and workers',
  zip: 'Reading a ZIP without unpacking it',
  pdf: 'Rendering a PDF with pdf.js',
  ios: 'Memory limits on iOS Safari',
  window: 'Prefetching near pages, releasing far ones',
  port: 'One sequence of images',
  sources: 'The page sources',
  pageList: 'A page list fixed when the book is added',
  ownership: 'Who owns a bitmap',
  pdfScale: 'PDF pages at scale 2',
  pdfLoading: 'Loading pdf.js only for a PDF',
  covers: 'Covers',
  pairing: 'Pairing pages into spreads',
  viewport: 'Fitting, zooming and overscroll',
  strip: 'The continuous strip',
  lessons: 'Failures without an error',
  rule: 'Hold a handle, decode a page, release it',
} as const;

const PDF_SCALE_HREF = `#${anchorSlug(RENDERING_SECTIONS.pdfScale)}`;

const OCR_CROP_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.crop)}`;

const OCR_CAPTURE_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.capture)}`;

const EPUB_ARCHIVE_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.archive)}`;

const EPUB_LAYOUTS_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.layouts)}`;

const STORAGE_BOOKS_HREF = `/docs/storage#${anchorSlug(STORAGE_SECTIONS.books)}`;

export {
  EPUB_ARCHIVE_HREF,
  EPUB_LAYOUTS_HREF,
  OCR_CAPTURE_HREF,
  OCR_CROP_HREF,
  PDF_SCALE_HREF,
  RENDERING_SECTIONS,
  STORAGE_BOOKS_HREF,
};
