import { match } from 'ts-pattern';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { CLICK_EDGE_SHARE, SIDE_ZONE_SHARE, tapZone, towards } from '$lib/shared/page-turn';
import type { TapZone, TouchTurns, TurnSide } from '$lib/shared/page-turn';

type ZonePointer = 'touch' | 'mouse';

type ZoneScene = {
  readonly pointer: ZonePointer;
  readonly turns: TouchTurns;
  readonly edgeClicks: boolean;
  readonly direction: ReadingDirection;
  readonly chromeShown: boolean;
};

type ZoneOutcome = 'previous' | 'next' | 'menu' | 'hide-menu';

type ZoneBand = {
  readonly from: number;
  readonly to: number;
  readonly outcome: ZoneOutcome;
};

const ZONE_WIDTH = 1000;

const CUT_POINTS: readonly number[] = [
  0,
  CLICK_EDGE_SHARE,
  SIDE_ZONE_SHARE,
  1 - SIDE_ZONE_SHARE,
  1 - CLICK_EDGE_SHARE,
  1,
];

function turnOrder(direction: ReadingDirection): readonly [ZoneOutcome, ZoneOutcome] {
  return direction === 'rtl' ? ['next', 'previous'] : ['previous', 'next'];
}

function sideOutcome(side: TurnSide, direction: ReadingDirection): ZoneOutcome {
  return towards(side, turnOrder(direction));
}

function clickedSide(fraction: number): TurnSide | null {
  if (fraction < CLICK_EDGE_SHARE) return 'left';
  if (fraction > 1 - CLICK_EDGE_SHARE) return 'right';

  return null;
}

function touchOutcome(fraction: number, scene: ZoneScene): ZoneOutcome {
  if (scene.chromeShown) return 'hide-menu';

  return match<TapZone, ZoneOutcome>(tapZone(fraction * ZONE_WIDTH, ZONE_WIDTH, scene.turns))
    .with('centre', () => 'menu')
    .with('left', 'right', (side) => sideOutcome(side, scene.direction))
    .exhaustive();
}

function mouseOutcome(fraction: number, scene: ZoneScene): ZoneOutcome {
  const side = scene.edgeClicks ? clickedSide(fraction) : null;
  return side === null ? 'menu' : sideOutcome(side, scene.direction);
}

function zoneOutcome(fraction: number, scene: ZoneScene): ZoneOutcome {
  return match(scene.pointer)
    .with('touch', () => touchOutcome(fraction, scene))
    .with('mouse', () => mouseOutcome(fraction, scene))
    .exhaustive();
}

function zoneBands(scene: ZoneScene): readonly ZoneBand[] {
  const bands: ZoneBand[] = [];
  for (const [index, from] of CUT_POINTS.slice(0, -1).entries()) {
    const to = CUT_POINTS[index + 1] ?? 1;
    const outcome = zoneOutcome((from + to) / 2, scene);
    const last = bands.at(-1);
    if (last !== undefined && last.outcome === outcome) bands[bands.length - 1] = { ...last, to };
    else bands.push({ from, to, outcome });
  }
  return bands;
}

function zoneOutcomeLabel(outcome: ZoneOutcome): string {
  return match(outcome)
    .with('previous', () => 'Previous page')
    .with('next', () => 'Next page')
    .with('menu', () => 'Show the bars')
    .with('hide-menu', () => 'Hide the bars')
    .exhaustive();
}

export { zoneBands, zoneOutcome, zoneOutcomeLabel };
export type { ZoneBand, ZoneOutcome, ZonePointer, ZoneScene };
