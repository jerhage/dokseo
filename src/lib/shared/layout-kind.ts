type ImageLayoutKind = 'paged' | 'continuous';

type LayoutKind = ImageLayoutKind | 'flow';

type ReadingDirection = 'rtl' | 'ltr';

type PagePairing = 'single' | 'double' | 'double-after-cover';

const PAGE_PAIRINGS: readonly PagePairing[] = ['single', 'double', 'double-after-cover'];

function imageLayoutKind(layoutKind: LayoutKind): ImageLayoutKind | null {
  return layoutKind === 'flow' ? null : layoutKind;
}

function effectiveDirection(direction: ReadingDirection, layoutKind: LayoutKind): ReadingDirection {
  return direction === 'rtl' && layoutKind !== 'continuous' ? 'rtl' : 'ltr';
}

function effectivePairing(pairing: PagePairing, layoutKind: ImageLayoutKind): PagePairing {
  return layoutKind === 'continuous' ? 'single' : pairing;
}

export { PAGE_PAIRINGS, imageLayoutKind, effectiveDirection, effectivePairing };
export type { ImageLayoutKind, LayoutKind, ReadingDirection, PagePairing };
