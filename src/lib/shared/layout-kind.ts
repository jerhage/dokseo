export type LayoutKind = 'paged' | 'continuous';

export type ReadingDirection = 'rtl' | 'ltr';

export type PagePairing = 'single' | 'double' | 'double-after-cover';

export const PAGE_PAIRINGS: readonly PagePairing[] = ['single', 'double', 'double-after-cover'];
