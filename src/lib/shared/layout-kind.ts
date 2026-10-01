type ImageLayoutKind = 'paged' | 'continuous';

type LayoutKind = ImageLayoutKind | 'flow';

type ReadingDirection = 'rtl' | 'ltr';

type PagePairing = 'single' | 'double' | 'double-after-cover';

const PAGE_PAIRINGS: readonly PagePairing[] = ['single', 'double', 'double-after-cover'];

const LAYOUT_KINDS: readonly LayoutKind[] = ['paged', 'continuous', 'flow'];

const READING_DIRECTIONS: readonly ReadingDirection[] = ['rtl', 'ltr'];

function isLayoutKind(value: unknown): value is LayoutKind {
  return LAYOUT_KINDS.some((kind) => kind === value);
}

function isReadingDirection(value: unknown): value is ReadingDirection {
  return READING_DIRECTIONS.some((direction) => direction === value);
}

function isPagePairing(value: unknown): value is PagePairing {
  return PAGE_PAIRINGS.some((pairing) => pairing === value);
}

function imageLayoutKind(layoutKind: LayoutKind): ImageLayoutKind | null {
  return layoutKind === 'flow' ? null : layoutKind;
}

function effectiveDirection(direction: ReadingDirection, layoutKind: LayoutKind): ReadingDirection {
  return direction === 'rtl' && layoutKind !== 'continuous' ? 'rtl' : 'ltr';
}

function effectivePairing(pairing: PagePairing, layoutKind: ImageLayoutKind): PagePairing {
  return layoutKind === 'continuous' ? 'single' : pairing;
}

export {
  PAGE_PAIRINGS,
  imageLayoutKind,
  effectiveDirection,
  effectivePairing,
  isLayoutKind,
  isPagePairing,
  isReadingDirection,
};
export type { ImageLayoutKind, LayoutKind, ReadingDirection, PagePairing };
