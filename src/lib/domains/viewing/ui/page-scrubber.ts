import { match } from 'ts-pattern';
import type { ImageIndex } from '$lib/shared/ids';
import type { ImageLayoutKind, ReadingDirection } from '$lib/shared/layout-kind';
import type { PageGroup } from '../domain/page-pairing';

type ScrubSource = {
  readonly layout: ImageLayoutKind;
  readonly groups: readonly PageGroup[];
  readonly group: number;
  readonly index: ImageIndex;
  readonly total: number;
};

type TurnsSide = 'before' | 'after';

type ScrubPlace = {
  readonly steps: number;
  readonly at: number;
};

const NO_PAGE = '—';

function pageNumber(index: number): string {
  return String(index + 1).padStart(3, '0');
}

function within(step: number, steps: number): number {
  return steps === 0 ? 0 : Math.min(Math.max(step, 0), steps - 1);
}

function scrubPlace(source: ScrubSource): ScrubPlace {
  return match(source.layout)
    .with('paged', () => ({
      steps: source.groups.length,
      at: within(source.group, source.groups.length),
    }))
    .with('continuous', () => ({
      steps: source.total,
      at: within(source.index, source.total),
    }))
    .exhaustive();
}

function stepMarker(source: ScrubSource, step: number): string {
  const pages = match(source.layout)
    .with('paged', (): readonly number[] => source.groups[step] ?? [])
    .with('continuous', (): readonly number[] =>
      Number.isInteger(step) && step >= 0 && step < source.total ? [step] : [],
    )
    .exhaustive();

  const shown = pages.length === 0 ? NO_PAGE : pages.map(pageNumber).join('–');
  return `${shown} / ${source.total}`;
}

function scrubStep(value: string, steps: number): number | null {
  if (steps <= 0 || value.trim() === '') return null;

  const step = Number(value);
  if (!Number.isInteger(step)) return null;

  return within(step, steps);
}

function turnsSide(direction: ReadingDirection): TurnsSide {
  return direction === 'rtl' ? 'before' : 'after';
}

export { scrubPlace, scrubStep, stepMarker, turnsSide };
export type { ScrubPlace, ScrubSource, TurnsSide };
