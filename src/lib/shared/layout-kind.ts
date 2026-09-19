export type LayoutKind = 'paged' | 'continuous';

export type ReadingDirection = 'rtl' | 'ltr';

export const LAYOUT_KINDS: readonly LayoutKind[] = ['paged', 'continuous'];

export const READING_DIRECTIONS: readonly ReadingDirection[] = ['rtl', 'ltr'];

export function isLayoutKind(v: unknown): v is LayoutKind {
  return typeof v === 'string' && (LAYOUT_KINDS as readonly string[]).includes(v);
}

export function isReadingDirection(v: unknown): v is ReadingDirection {
  return typeof v === 'string' && (READING_DIRECTIONS as readonly string[]).includes(v);
}
