export type LayoutKind = 'paged' | 'continuous';

export type ReadingDirection = 'rtl' | 'ltr';

export type PagePairing = 'single' | 'double' | 'double-after-cover';

export const LAYOUT_KINDS: readonly LayoutKind[] = ['paged', 'continuous'];

export const READING_DIRECTIONS: readonly ReadingDirection[] = ['rtl', 'ltr'];

export const PAGE_PAIRINGS: readonly PagePairing[] = ['single', 'double', 'double-after-cover'];

export function isLayoutKind(v: unknown): v is LayoutKind {
  return typeof v === 'string' && (LAYOUT_KINDS as readonly string[]).includes(v);
}

export function isReadingDirection(v: unknown): v is ReadingDirection {
  return typeof v === 'string' && (READING_DIRECTIONS as readonly string[]).includes(v);
}

export function isPagePairing(v: unknown): v is PagePairing {
  return typeof v === 'string' && (PAGE_PAIRINGS as readonly string[]).includes(v);
}
