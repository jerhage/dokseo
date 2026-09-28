import { match } from 'ts-pattern';

type DockPlacement = 'side' | 'rail' | 'sheet' | 'peek';

type DockArrow = 'left' | 'right' | 'up' | 'down';

type DockToggle = {
  readonly points: DockArrow;
  readonly open: boolean;
};

type DockWords = {
  readonly label: string;
  readonly expandLabel: string;
  readonly collapseLabel: string;
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

export { dockLabel, dockName, dockPlacement, dockTally, dockToggle };
export type { DockArrow, DockPlacement, DockToggle, DockWords };
