import { match } from 'ts-pattern';
import { pairPages } from '$lib/domains/viewing/domain/page-pairing';
import type { PageGroup } from '$lib/domains/viewing/domain/page-pairing';
import type { Size } from '$lib/shared/geometry';
import { effectiveDirection, effectivePairing } from '$lib/shared/layout-kind';
import type {
  ImageLayoutKind,
  PagePairing,
  PagePairingChoice,
  ReadingDirection,
  ScreenWidth,
} from '$lib/shared/layout-kind';
import { isNarrow } from '$lib/shared/panel-dock';

type ScreenPreset = 'phone' | 'tablet' | 'laptop';

type Orientation = 'portrait' | 'landscape';

type PairingInput = {
  readonly screen: ScreenPreset;
  readonly orientation: Orientation;
  readonly choice: PagePairingChoice;
  readonly direction: ReadingDirection;
  readonly layout: ImageLayoutKind;
  readonly compactWidth: number;
};

type PairedSheet = { readonly index: number; readonly size: Size; readonly wide: boolean };

type PairingScene = {
  readonly viewport: Size;
  readonly screenWidth: ScreenWidth;
  readonly pairing: PagePairing;
  readonly direction: ReadingDirection;
  readonly groups: readonly (readonly PairedSheet[])[];
};

const SCREEN_SIZES: Readonly<Record<ScreenPreset, Size>> = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  laptop: { width: 900, height: 1440 },
};

const PORTRAIT_PAGE: Size = { width: 1200, height: 1800 };

const SPREAD_PAGE: Size = { width: 2400, height: 1800 };

const SAMPLE_BOOK: readonly Size[] = [
  PORTRAIT_PAGE,
  PORTRAIT_PAGE,
  PORTRAIT_PAGE,
  PORTRAIT_PAGE,
  SPREAD_PAGE,
  PORTRAIT_PAGE,
  PORTRAIT_PAGE,
  PORTRAIT_PAGE,
  PORTRAIT_PAGE,
];

function viewportOf(screen: ScreenPreset, orientation: Orientation): Size {
  const { width, height } = SCREEN_SIZES[screen];
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  return match(orientation)
    .with('portrait', () => ({ width: short, height: long }))
    .with('landscape', () => ({ width: long, height: short }))
    .exhaustive();
}

function screenWidthOf(viewport: Size, compactWidth: number): ScreenWidth {
  return isNarrow(viewport.width, compactWidth) ? 'narrow' : 'wide';
}

function isWideSheet(size: Size): boolean {
  return size.width > size.height;
}

function sheetsOf(groups: readonly PageGroup[], sizes: readonly Size[]): PairingScene['groups'] {
  return groups.map((group) =>
    group.flatMap((index) => {
      const size = sizes[index];
      return size === undefined ? [] : [{ index, size, wide: isWideSheet(size) }];
    }),
  );
}

function pairingScene(input: PairingInput, sizes: readonly Size[] = SAMPLE_BOOK): PairingScene {
  const viewport = viewportOf(input.screen, input.orientation);
  const screenWidth = screenWidthOf(viewport, input.compactWidth);
  const pairing = effectivePairing(input.choice, input.layout, screenWidth);
  return {
    viewport,
    screenWidth,
    pairing,
    direction: effectiveDirection(input.direction, input.layout),
    groups: sheetsOf(pairPages(sizes, pairing), sizes),
  };
}

export { SAMPLE_BOOK, SCREEN_SIZES, pairingScene, viewportOf };
export type { Orientation, PairedSheet, PairingInput, PairingScene, ScreenPreset };
