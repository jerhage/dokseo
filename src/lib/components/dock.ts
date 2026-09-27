import { match } from 'ts-pattern';

type DockPlacement = 'side' | 'rail' | 'sheet' | 'peek';

type DockArrow = 'left' | 'right' | 'up' | 'down';

type DockToggle = {
  readonly points: DockArrow;
  readonly open: boolean;
};

type DockWords = {
  readonly showLabel: string;
  readonly hideLabel: string;
};

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
  return dockToggle(placement).open ? words.hideLabel : words.showLabel;
}

function dockTally(placement: DockPlacement, count: number | null): number | null {
  if (dockToggle(placement).open) return null;
  return count !== null && count > 0 ? count : null;
}

function dockName(placement: DockPlacement, count: number | null, words: DockWords): string {
  const label = dockLabel(placement, words);
  const tally = dockTally(placement, count);
  return tally === null ? label : `${label}, ${tally}`;
}

export { dockLabel, dockName, dockPlacement, dockTally, dockToggle };
export type { DockArrow, DockPlacement, DockToggle, DockWords };
