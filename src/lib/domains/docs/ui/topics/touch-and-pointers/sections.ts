import { anchorSlug } from '$lib/components/table-of-contents';

const TOUCH_SECTIONS = {
  click: 'When a click is not enough',
  events: 'Pointer events',
  capture: 'Pointer capture',
  touchAction: 'touch-action and pointercancel',
  delay: 'The 300 ms delay',
  classify: 'Tap, swipe or drag',
  media: 'Which pointers a device has',
  ipad: 'The iPad and the Apple Pencil',
  rtl: 'Right-to-left page order',
  classifier: "Dokseo's gesture classifier",
  zones: 'Tap zones and swipe only',
  edges: 'Clicks on the page edges',
  settings: 'Showing the right settings',
  marquee: 'Drawing a selection',
  guide: 'The touch guide',
  epub: 'Taps in the EPUB reader',
  rules: 'Rules Dokseo keeps',
} as const;

type TouchSectionKey = keyof typeof TOUCH_SECTIONS;

function touchHref(key: TouchSectionKey): string {
  return `#${anchorSlug(TOUCH_SECTIONS[key])}`;
}

export { TOUCH_SECTIONS, touchHref };
export type { TouchSectionKey };
