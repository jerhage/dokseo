import { match } from 'ts-pattern';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { TapZone, TouchTurns, TurnSide } from '$lib/shared/page-turn';
import type { InputKind } from './gesture-hint';
import { moveTowards } from './page-moves';

type ZoneLabel = { readonly zone: TapZone; readonly label: string };

type ZoneOverlayScene = {
  readonly turns: TouchTurns;
  readonly input: InputKind;
  readonly seen: boolean;
};

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

function showsZoneOverlay(scene: ZoneOverlayScene): boolean {
  return scene.turns === 'tap-zones' && scene.input === 'touch' && !scene.seen;
}

export { showsZoneOverlay, zoneLabels };
export type { ZoneLabel, ZoneOverlayScene };
