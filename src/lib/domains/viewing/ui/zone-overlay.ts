import { match } from 'ts-pattern';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { TapZone, TurnSide } from '$lib/shared/page-turn';
import { moveTowards } from './page-moves';

type ZoneLabel = { readonly zone: TapZone; readonly label: string };

function sideLabel(side: TurnSide, direction: ReadingDirection): ZoneLabel {
  const label = match(moveTowards(side, 'paged', direction))
    .with('decrement', () => 'Previous')
    .with('increment', () => 'Next')
    .exhaustive();
  return { zone: side, label };
}

function zoneLabels(direction: ReadingDirection): readonly ZoneLabel[] {
  return [
    sideLabel('left', direction),
    { zone: 'centre', label: 'Menu' },
    sideLabel('right', direction),
  ];
}

export { zoneLabels };
export type { ZoneLabel };
