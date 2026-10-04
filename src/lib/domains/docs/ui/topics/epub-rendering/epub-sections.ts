import { anchorSlug } from '$lib/components/table-of-contents';

const EPUB_SECTIONS = {
  archive: 'What is inside an EPUB',
  package: 'The package document',
  layouts: 'Reflowable and fixed layout',
  isolation: 'One document per chapter',
  columns: 'Pages from CSS columns',
  vertical: 'Vertical text and right-to-left pages',
  cfi: 'EPUB CFI, a position that survives reflow',
  foliate: 'foliate-js in Dokseo',
  flowing: 'The flowing domain',
  frames: 'Chapters in blob frames',
  styles: "Dokseo's chapter styles",
  settings: 'Text size and furigana',
  probe: "Finding a book's writing mode",
  anchoring: 'How a capture anchors its text',
  lock: 'The turn lock',
  bugs: 'Bugs that changed the reader',
  title: 'The title from the metadata',
  rules: 'Rules for changing the reader',
} as const;

type EpubSectionKey = keyof typeof EPUB_SECTIONS;

function epubSectionHref(key: EpubSectionKey): string {
  return `#${anchorSlug(EPUB_SECTIONS[key])}`;
}

const SECURITY_CHAPTERS_HREF = '/docs/security-headers#epub-chapters-as-blob-frames';

const SECURITY_INHERIT_HREF = '/docs/security-headers#blob-documents-inherit-the-policy';

const SECURITY_WEBKIT_HREF = '/docs/security-headers#the-safari-frame-ancestors-failure';

export {
  EPUB_SECTIONS,
  epubSectionHref,
  SECURITY_CHAPTERS_HREF,
  SECURITY_INHERIT_HREF,
  SECURITY_WEBKIT_HREF,
};
export type { EpubSectionKey };
