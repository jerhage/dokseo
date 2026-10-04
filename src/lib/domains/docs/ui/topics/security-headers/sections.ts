import { anchorSlug } from '$lib/components/table-of-contents';

const SECTIONS = {
  policy: 'What a content security policy blocks',
  delivery: 'Header or meta tag',
  isolation: 'Cross-origin isolation',
  embedder: 'Responses under require-corp',
  workers: 'Workers have their own policy',
  frames: 'Blob documents inherit the policy',
  directives: "Dokseo's policy, directive by directive",
  sources: "Where Dokseo's headers come from",
  downloads: 'Model downloads under COEP',
  chapters: 'EPUB chapters as blob frames',
  webkit: 'The Safari frame-ancestors failure',
} as const;

type SectionKey = keyof typeof SECTIONS;

function sectionHref(key: SectionKey): string {
  return `#${anchorSlug(SECTIONS[key])}`;
}

export { SECTIONS, sectionHref };
export type { SectionKey };
