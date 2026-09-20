export type LayoutKind = 'paged' | 'continuous';

export type ReadingDirection = 'rtl' | 'ltr';

export type PagePairing = 'single' | 'double' | 'double-after-cover';

export const PAGE_PAIRINGS: readonly PagePairing[] = ['single', 'double', 'double-after-cover'];

export function effectiveDirection(
  direction: ReadingDirection,
  layoutKind: LayoutKind,
): ReadingDirection {
  return direction === 'rtl' && layoutKind !== 'continuous' ? 'rtl' : 'ltr';
}

export function effectivePairing(pairing: PagePairing, layoutKind: LayoutKind): PagePairing {
  return layoutKind === 'continuous' ? 'single' : pairing;
}
