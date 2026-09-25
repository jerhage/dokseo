import type { ImageLayoutKind, PagePairing, ReadingDirection } from './layout-kind';

type LayoutChoice<T> = {
  readonly value: T;
  readonly label: string;
};

const LAYOUT_KIND_LEGEND_BRIEF = 'Layout';

const LAYOUT_KIND_CHOICES: readonly LayoutChoice<ImageLayoutKind>[] = [
  { value: 'paged', label: 'Pages, turned one group at a time' },
  { value: 'continuous', label: 'One continuous strip, scrolled' },
];

const PAGE_PAIRING_LEGEND = 'Page pairing';

const PAGE_PAIRING_CHOICES: readonly LayoutChoice<PagePairing>[] = [
  { value: 'single', label: 'One page at a time' },
  { value: 'double', label: 'Two pages side by side' },
  { value: 'double-after-cover', label: 'Two pages, cover alone' },
];

const READING_DIRECTION_LEGEND = 'Reading direction';

const READING_DIRECTION_CHOICES: readonly LayoutChoice<ReadingDirection>[] = [
  { value: 'rtl', label: 'Right to left' },
  { value: 'ltr', label: 'Left to right' },
];

export {
  LAYOUT_KIND_LEGEND_BRIEF,
  LAYOUT_KIND_CHOICES,
  PAGE_PAIRING_LEGEND,
  PAGE_PAIRING_CHOICES,
  READING_DIRECTION_LEGEND,
  READING_DIRECTION_CHOICES,
};
export type { LayoutChoice };
