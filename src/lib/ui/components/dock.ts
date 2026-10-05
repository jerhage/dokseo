import { match } from 'ts-pattern';
import { isFlick } from './carousel';

type DockPlacement = 'side' | 'rail' | 'sheet' | 'peek';

type DockArrow = 'left' | 'right' | 'up' | 'down';

type DockToggle = {
  readonly points: DockArrow;
  readonly open: boolean;
};

type DockDetent = 'standard' | 'tall';

type DockSheetHeights = Readonly<Record<DockDetent, number>>;

type DockSheetSettle =
  | { readonly kind: 'detent'; readonly detent: DockDetent }
  | { readonly kind: 'close' };

type DockSheetStop = { readonly settle: DockSheetSettle; readonly at: number };

type DockWords = {
  readonly label: string;
  readonly expandLabel: string;
  readonly collapseLabel: string;
};

const DOCK_DETENTS: readonly DockDetent[] = ['standard', 'tall'];

const DOCK_DETENT_TOKENS = {
  standard: '--layout-sheet-height',
  tall: '--layout-sheet-height-tall',
} as const satisfies Record<DockDetent, `--${string}`>;

function dockPlacement(narrow: boolean, asked: boolean | null): DockPlacement {
  const open = asked ?? !narrow;
  if (narrow) return open ? 'sheet' : 'peek';
  return open ? 'side' : 'rail';
}

function dockToggle(placement: DockPlacement): DockToggle {
  return match<DockPlacement, DockToggle>(placement)
    .with('side', () => ({ points: 'right', open: true }))
    .with('rail', () => ({ points: 'left', open: false }))
    .with('sheet', () => ({ points: 'down', open: true }))
    .with('peek', () => ({ points: 'up', open: false }))
    .exhaustive();
}

function dockLabel(placement: DockPlacement, words: DockWords): string {
  return dockToggle(placement).open ? words.collapseLabel : words.expandLabel;
}

function dockTally(placement: DockPlacement, count: number | undefined): number | null {
  if (dockToggle(placement).open) return null;
  return count !== undefined && count > 0 ? count : null;
}

function dockName(placement: DockPlacement, count: number | undefined, words: DockWords): string {
  const tally = dockTally(placement, count);
  const counted = tally === null ? [] : [`${tally}`];
  const parts =
    placement === 'peek'
      ? [words.label, ...counted, words.expandLabel]
      : [dockLabel(placement, words), ...counted];
  return parts.join(', ');
}

function dockCover(drawer: number, reserve: number): number {
  if (!Number.isFinite(drawer) || !Number.isFinite(reserve)) return 0;
  return Math.max(drawer - reserve, 0);
}

function dockDetentHeight(detent: DockDetent): string {
  return `var(${DOCK_DETENT_TOKENS[detent]})`;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function dockSheetMeasured(heights: DockSheetHeights): boolean {
  return (
    isPositiveFinite(heights.standard) &&
    isPositiveFinite(heights.tall) &&
    heights.standard <= heights.tall
  );
}

function dockSheetHeight(from: number, travel: number, heights: DockSheetHeights): number {
  const height = from - travel;
  if (!Number.isFinite(height)) return from;
  return Math.min(Math.max(height, 0), heights.tall);
}

function dockSheetStops(heights: DockSheetHeights): readonly DockSheetStop[] {
  return [
    { settle: { kind: 'close' }, at: 0 },
    ...DOCK_DETENTS.map((detent) => ({
      settle: { kind: 'detent', detent } as const,
      at: heights[detent],
    })),
  ];
}

function nearestStop(stops: readonly DockSheetStop[], height: number): DockSheetSettle {
  const [first, ...rest] = stops;
  if (first === undefined) return { kind: 'close' };
  const nearest = rest.reduce(
    (best, stop) => (Math.abs(stop.at - height) < Math.abs(best.at - height) ? stop : best),
    first,
  );
  return nearest.settle;
}

function stopBelow(stops: readonly DockSheetStop[], height: number): DockSheetSettle {
  const below = stops.findLast((stop) => stop.at < height);
  return below === undefined ? { kind: 'close' } : below.settle;
}

function stopAbove(stops: readonly DockSheetStop[], height: number): DockSheetSettle {
  const above = stops.find((stop) => stop.at > height) ?? stops.at(-1);
  return above === undefined ? { kind: 'close' } : above.settle;
}

function dockSheetSettle(
  height: number,
  travel: number,
  elapsedMs: number,
  heights: DockSheetHeights,
  current: DockDetent,
): DockSheetSettle {
  if (!dockSheetMeasured(heights) || !Number.isFinite(height) || !Number.isFinite(travel)) {
    return { kind: 'detent', detent: current };
  }

  const stops = dockSheetStops(heights);
  if (!isFlick(Math.abs(travel), elapsedMs)) return nearestStop(stops, height);

  return travel > 0 ? stopBelow(stops, height) : stopAbove(stops, height);
}

function dockDetentBeside(detent: DockDetent, step: -1 | 1): DockDetent {
  const at = DOCK_DETENTS.indexOf(detent) + step;
  const clamped = Math.min(Math.max(at, 0), DOCK_DETENTS.length - 1);
  return DOCK_DETENTS[clamped] ?? detent;
}

function dockDetentAfterKey(detent: DockDetent, key: string): DockDetent | null {
  if (key === 'ArrowUp') return dockDetentBeside(detent, 1);
  if (key === 'ArrowDown') return dockDetentBeside(detent, -1);
  return null;
}

function dockDetentToggled(detent: DockDetent): DockDetent {
  return match<DockDetent, DockDetent>(detent)
    .with('standard', () => 'tall')
    .with('tall', () => 'standard')
    .exhaustive();
}

export {
  DOCK_DETENTS,
  DOCK_DETENT_TOKENS,
  dockCover,
  dockDetentAfterKey,
  dockDetentHeight,
  dockDetentToggled,
  dockSheetHeight,
  dockSheetMeasured,
  dockSheetSettle,
  dockLabel,
  dockName,
  dockPlacement,
  dockTally,
  dockToggle,
};
export type {
  DockArrow,
  DockDetent,
  DockPlacement,
  DockSheetHeights,
  DockSheetSettle,
  DockToggle,
  DockWords,
};
