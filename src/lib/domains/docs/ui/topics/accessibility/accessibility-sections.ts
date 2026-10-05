import { anchorSlug } from '$lib/ui/components/table-of-contents';
import { EPUB_SECTIONS } from '../epub-rendering/epub-sections';
import { TOUCH_SECTIONS } from '../touch-and-pointers/sections';
import { UI_LIBRARY_SECTIONS } from '../ui-library/sections';
import { UNICODE_SECTIONS } from '../unicode/unicode-sections';

const ACCESSIBILITY_SECTIONS = {
  tree: 'The accessibility tree',
  semantics: 'Native HTML before ARIA',
  names: 'Accessible names and descriptions',
  focus: 'Focus and the tab order',
  routes: 'Focus after a route change',
  keys: 'Turning pages with keys',
  dialogs: 'Modal dialogs and focus traps',
  live: 'Live regions',
  motion: 'Reduced motion',
  color: 'Contrast and color alone',
  targets: 'Target sizes',
  text: 'Text a screen reader can reach',
  dokseoNames: "Names in Dokseo's base components",
  dokseoKeys: "Paging keys in Dokseo's readers",
  dokseoDialogs: "Dokseo's modal",
  dokseoHidden: 'Hidden bars are inert',
  dokseoLive: 'Announcements in Dokseo',
  dokseoMotion: 'Motion in Dokseo',
  dokseoText: 'Recognized text in Dokseo',
  rules: 'Rules for an accessible reader',
} as const;

type AccessibilitySectionKey = keyof typeof ACCESSIBILITY_SECTIONS;

function accessibilityHref(key: AccessibilitySectionKey): string {
  return `#${anchorSlug(ACCESSIBILITY_SECTIONS[key])}`;
}

const TOUCH_ZONES_HREF = `/docs/touch-and-pointers#${anchorSlug(TOUCH_SECTIONS.zones)}`;

const TOUCH_MEDIA_HREF = `/docs/touch-and-pointers#${anchorSlug(TOUCH_SECTIONS.media)}`;

const UI_COMPONENTS_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.components)}`;

const UI_TOKENS_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.dokseoTokens)}`;

const UI_THEMES_HREF = `/docs/ui-library#${anchorSlug(UI_LIBRARY_SECTIONS.themes)}`;

const EPUB_VERTICAL_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.vertical)}`;

const EPUB_FRAMES_HREF = `/docs/epub-rendering#${anchorSlug(EPUB_SECTIONS.frames)}`;

const UNICODE_LANG_HREF = `/docs/unicode#${anchorSlug(UNICODE_SECTIONS.lang)}`;

const UNICODE_RUBY_HREF = `/docs/unicode#${anchorSlug(UNICODE_SECTIONS.ruby)}`;

export {
  ACCESSIBILITY_SECTIONS,
  EPUB_FRAMES_HREF,
  EPUB_VERTICAL_HREF,
  TOUCH_MEDIA_HREF,
  TOUCH_ZONES_HREF,
  UI_COMPONENTS_HREF,
  UI_THEMES_HREF,
  UI_TOKENS_HREF,
  UNICODE_LANG_HREF,
  UNICODE_RUBY_HREF,
  accessibilityHref,
};
export type { AccessibilitySectionKey };
