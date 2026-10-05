import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { IDENTITY_SECTIONS } from '../book-identity/sections';
import { EPUB_SECTIONS } from '../epub-rendering/epub-sections';
import { EXPORT_IMPORT_SECTIONS } from '../export-import/export-import-sections';
import { OCR_SECTIONS } from '../ocr/ocr-sections';

const UNICODE_SECTIONS = {
  characters: 'Characters, code points and code units',
  encodings: 'UTF-8 and UTF-16',
  strings: 'JavaScript strings are UTF-16',
  graphemes: 'Graphemes, what a reader calls a character',
  combining: 'Combining marks and dakuten',
  normalization: 'The four normalization forms',
  compatibility: 'Compatibility characters in Japanese text',
  caseFolding: 'Case folding, and a script with no case',
  comparing: 'Comparing and sorting with a collator',
  words: 'Words without spaces',
  lineBreaks: 'Where a Japanese line may break',
  vertical: 'Vertical writing in CSS',
  orientation: 'Upright and sideways characters',
  ruby: 'Ruby for furigana',
  han: 'One code point, several glyph styles',
  boundary: 'NFC where a file name enters Dokseo',
  titles: 'Titles in book matching',
  search: 'Folding for search',
  tags: 'Tag names',
  sorting: 'Natural order for file names',
  offsets: 'Offsets in a CFI and a quote',
  furigana: 'Furigana in the flow reader',
  ocrText: 'The text OCR returns',
  lang: 'The language on each element',
  rules: 'Rules for text in Dokseo',
} as const;

type UnicodeSectionKey = keyof typeof UNICODE_SECTIONS;

function unicodeHref(key: UnicodeSectionKey): string {
  return `#${anchorSlug(UNICODE_SECTIONS[key])}`;
}

const EPUB_CFI_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.cfi)}`;

const EPUB_ANCHORING_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.anchoring)}`;

const EPUB_STYLES_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.styles)}`;

const EPUB_SETTINGS_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.settings)}`;

const EPUB_VERTICAL_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.vertical)}`;

const EPUB_PROBE_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.probe)}`;

const OCR_TOKENS_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.tokens)}`;

const OCR_PIPELINE_HREF = `/docs/ocr#${anchorSlug(OCR_SECTIONS.pipeline)}`;

const IDENTITY_NAMES_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.names)}`;

const IDENTITY_LADDER_HREF = `/docs/book-identity#${anchorSlug(IDENTITY_SECTIONS.ladder)}`;

const EXPORT_TAGS_HREF = `/docs/export-import#${anchorSlug(EXPORT_IMPORT_SECTIONS.tags)}`;

export {
  EPUB_ANCHORING_HREF,
  EPUB_CFI_HREF,
  EPUB_PROBE_HREF,
  EPUB_SETTINGS_HREF,
  EPUB_STYLES_HREF,
  EPUB_VERTICAL_HREF,
  EXPORT_TAGS_HREF,
  IDENTITY_LADDER_HREF,
  IDENTITY_NAMES_HREF,
  OCR_PIPELINE_HREF,
  OCR_TOKENS_HREF,
  UNICODE_SECTIONS,
  unicodeHref,
};
export type { UnicodeSectionKey };
