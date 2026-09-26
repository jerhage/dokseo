import type { ReadingDirection } from './layout-kind';

type TurnsSide = 'before' | 'after';

function stepWithin(step: number, steps: number): number {
  return steps === 0 ? 0 : Math.min(Math.max(step, 0), steps - 1);
}

function scrubStep(value: string, steps: number): number | null {
  if (steps <= 0 || value.trim() === '') return null;

  const step = Number(value);
  if (!Number.isInteger(step)) return null;

  return stepWithin(step, steps);
}

function turnsSide(direction: ReadingDirection): TurnsSide {
  return direction === 'rtl' ? 'before' : 'after';
}

export { scrubStep, stepWithin, turnsSide };
export type { TurnsSide };
