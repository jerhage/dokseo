import { match } from 'ts-pattern';

type DockPlacement = 'side' | 'rail' | 'sheet' | 'peek';

type DockArrow = 'left' | 'right' | 'up' | 'down';

type DockToggle = {
  readonly points: DockArrow;
  readonly label: string;
  readonly open: boolean;
};

const SHOW_LABEL = 'Show captures';

const HIDE_LABEL = 'Hide captures';

function isNarrow(width: number, breakpoint: number): boolean {
  return width > 0 && breakpoint > 0 && width < breakpoint;
}

function dockPlacement(narrow: boolean, asked: boolean | null): DockPlacement {
  const open = asked ?? !narrow;
  if (narrow) return open ? 'sheet' : 'peek';
  return open ? 'side' : 'rail';
}

function dockToggle(placement: DockPlacement): DockToggle {
  return match<DockPlacement, DockToggle>(placement)
    .with('side', () => ({ points: 'right', label: HIDE_LABEL, open: true }))
    .with('rail', () => ({ points: 'left', label: SHOW_LABEL, open: false }))
    .with('sheet', () => ({ points: 'down', label: HIDE_LABEL, open: true }))
    .with('peek', () => ({ points: 'up', label: SHOW_LABEL, open: false }))
    .exhaustive();
}

function dockTally(placement: DockPlacement, count: number | null): number | null {
  if (dockToggle(placement).open) return null;
  return count !== null && count > 0 ? count : null;
}

function dockName(placement: DockPlacement, count: number | null): string {
  const label = dockToggle(placement).label;
  const tally = dockTally(placement, count);
  return tally === null ? label : `${label}, ${tally}`;
}

export { dockName, dockPlacement, dockTally, dockToggle, isNarrow };
export type { DockArrow, DockPlacement, DockToggle };
