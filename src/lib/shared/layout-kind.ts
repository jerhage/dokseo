type LayoutKind = 'paged' | 'continuous';

type ReadingDirection = 'rtl' | 'ltr';

type PagePairing = 'single' | 'double' | 'double-after-cover';

const PAGE_PAIRINGS: readonly PagePairing[] = ['single', 'double', 'double-after-cover'];

function effectiveDirection(direction: ReadingDirection, layoutKind: LayoutKind): ReadingDirection {
  return direction === 'rtl' && layoutKind !== 'continuous' ? 'rtl' : 'ltr';
}

function effectivePairing(pairing: PagePairing, layoutKind: LayoutKind): PagePairing {
  return layoutKind === 'continuous' ? 'single' : pairing;
}

export { PAGE_PAIRINGS, effectiveDirection, effectivePairing };
export type { LayoutKind, ReadingDirection, PagePairing };
