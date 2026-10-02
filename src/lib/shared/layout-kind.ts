type ImageLayoutKind = 'paged' | 'continuous';

type LayoutKind = ImageLayoutKind | 'flow';

type ReadingDirection = 'rtl' | 'ltr';

type PagePairing = 'single' | 'double' | 'double-after-cover';

type PagePairingChoice = PagePairing | 'auto';

type ScreenWidth = 'narrow' | 'wide';

const PAGE_PAIRINGS: readonly PagePairing[] = ['single', 'double', 'double-after-cover'];

const PAGE_PAIRING_CHOICE_VALUES: readonly PagePairingChoice[] = ['auto', ...PAGE_PAIRINGS];

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

function isPagePairingChoice(value: unknown): value is PagePairingChoice {
  return PAGE_PAIRING_CHOICE_VALUES.some((choice) => choice === value);
}

function imageLayoutKind(layoutKind: LayoutKind): ImageLayoutKind | null {
  return layoutKind === 'flow' ? null : layoutKind;
}

function effectiveDirection(direction: ReadingDirection, layoutKind: LayoutKind): ReadingDirection {
  return direction === 'rtl' && layoutKind !== 'continuous' ? 'rtl' : 'ltr';
}

function automaticPairing(screen: ScreenWidth): PagePairing {
  return screen === 'narrow' ? 'single' : 'double-after-cover';
}

function effectivePairing(
  pairing: PagePairingChoice,
  layoutKind: ImageLayoutKind,
  screen: ScreenWidth,
): PagePairing {
  if (layoutKind === 'continuous') return 'single';
  return pairing === 'auto' ? automaticPairing(screen) : pairing;
}

export {
  PAGE_PAIRINGS,
  PAGE_PAIRING_CHOICE_VALUES,
  imageLayoutKind,
  effectiveDirection,
  effectivePairing,
  isLayoutKind,
  isPagePairing,
  isPagePairingChoice,
  isReadingDirection,
};
export type {
  ImageLayoutKind,
  LayoutKind,
  ReadingDirection,
  PagePairing,
  PagePairingChoice,
  ScreenWidth,
};
