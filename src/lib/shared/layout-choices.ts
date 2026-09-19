import type { PagePairing, ReadingDirection } from './layout-kind';

export type LayoutChoice<T> = {
  readonly value: T;
  readonly label: string;
  readonly brief: string;
};

export const PAGE_PAIRING_LEGEND = 'Page pairing';

export const PAGE_PAIRING_LEGEND_BRIEF = 'Pages';

export const PAGE_PAIRING_CHOICES: readonly LayoutChoice<PagePairing>[] = [
  { value: 'single', label: 'One page at a time', brief: 'One' },
  { value: 'double', label: 'Two pages side by side', brief: 'Two' },
  { value: 'double-after-cover', label: 'Two pages, cover alone', brief: 'Two, cover alone' },
];

export const READING_DIRECTION_LEGEND = 'Reading direction';

export const READING_DIRECTION_LEGEND_BRIEF = 'Direction';

export const READING_DIRECTION_CHOICES: readonly LayoutChoice<ReadingDirection>[] = [
  { value: 'rtl', label: 'Right to left', brief: 'Right to left' },
  { value: 'ltr', label: 'Left to right', brief: 'Left to right' },
];

export const CONTINUOUS_READS_DOWNWARD = 'A continuous strip always reads downward.';

export const CONTINUOUS_HAS_NO_PAIRS = 'A continuous strip has no facing pages.';
