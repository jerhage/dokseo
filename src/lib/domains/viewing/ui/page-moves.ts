import { match } from 'ts-pattern';
import type { LayoutKind, ReadingDirection } from '$lib/shared/layout-kind';

export type MoveIntent = 'advance' | 'retreat';

export type MoveControl = {
  readonly intent: MoveIntent;
  readonly label: string;
  readonly glyph: string;
};

const LEFTWARD = '‹';
const RIGHTWARD = '›';
const UPWARD = '↑';
const DOWNWARD = '↓';

function pagedMoves(direction: ReadingDirection): readonly MoveControl[] {
  const advance = { intent: 'advance', label: 'Next page' } as const;
  const retreat = { intent: 'retreat', label: 'Previous page' } as const;

  return direction === 'rtl'
    ? [
        { ...advance, glyph: LEFTWARD },
        { ...retreat, glyph: RIGHTWARD },
      ]
    : [
        { ...retreat, glyph: LEFTWARD },
        { ...advance, glyph: RIGHTWARD },
      ];
}

function continuousMoves(): readonly MoveControl[] {
  return [
    { intent: 'retreat', label: 'Previous screen', glyph: UPWARD },
    { intent: 'advance', label: 'Next screen', glyph: DOWNWARD },
  ];
}

export function moveControls(
  layoutKind: LayoutKind,
  direction: ReadingDirection,
): readonly MoveControl[] {
  return match(layoutKind)
    .with('paged', () => pagedMoves(direction))
    .with('continuous', () => continuousMoves())
    .exhaustive();
}
