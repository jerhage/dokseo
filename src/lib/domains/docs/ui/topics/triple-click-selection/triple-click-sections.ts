import { anchorSlug } from '$lib/ui/components/table-of-contents';

const TRIPLE_CLICK_SECTIONS = {
  found: 'A highlight that never appeared',
  edges: 'Where each browser puts the edges',
  demo: 'Select it yourself',
  collapse: 'Why both ends print as /16',
  dokseo: 'How Dokseo copes',
} as const;

type TripleClickSectionKey = keyof typeof TRIPLE_CLICK_SECTIONS;

function tripleClickSectionHref(key: TripleClickSectionKey): string {
  return `#${anchorSlug(TRIPLE_CLICK_SECTIONS[key])}`;
}

const EPUB_CFI_HREF = '/docs/epub-rendering#epub-cfi-a-position-that-survives-reflow';

const EPUB_ANCHORING_HREF = '/docs/epub-rendering#how-a-capture-anchors-its-text';

export { EPUB_ANCHORING_HREF, EPUB_CFI_HREF, TRIPLE_CLICK_SECTIONS, tripleClickSectionHref };
export type { TripleClickSectionKey };
