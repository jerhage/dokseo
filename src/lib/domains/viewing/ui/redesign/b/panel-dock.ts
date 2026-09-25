import { match } from 'ts-pattern';

type DockPlacement = 'side' | 'rail' | 'sheet' | 'peek';

type DockToggle = {
  readonly glyph: string;
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
  return match(placement)
    .with('side', () => ({ glyph: '›', label: HIDE_LABEL, open: true }))
    .with('rail', () => ({ glyph: '‹', label: SHOW_LABEL, open: false }))
    .with('sheet', () => ({ glyph: '▾', label: HIDE_LABEL, open: true }))
    .with('peek', () => ({ glyph: '▴', label: SHOW_LABEL, open: false }))
    .exhaustive();
}

export { dockPlacement, dockToggle, isNarrow };
export type { DockPlacement, DockToggle };
