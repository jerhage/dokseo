import { match } from 'ts-pattern';
import type { ImageIndex } from '$lib/shared/ids';
import type { ImageLayoutKind } from '$lib/shared/layout-kind';
import { stepWithin } from '$lib/shared/page-bar';
import type { PageGroup } from '../domain/page-pairing';

type ScrubSource = {
  readonly layout: ImageLayoutKind;
  readonly groups: readonly PageGroup[];
  readonly group: number;
  readonly index: ImageIndex;
  readonly total: number;
};

type ScrubPlace = {
  readonly steps: number;
  readonly at: number;
};

const NO_PAGE = '—';

function pageNumber(index: number): string {
  return String(index + 1).padStart(3, '0');
}

function scrubPlace(source: ScrubSource): ScrubPlace {
  return match(source.layout)
    .with('paged', () => ({
      steps: source.groups.length,
      at: stepWithin(source.group, source.groups.length),
    }))
    .with('continuous', () => ({
      steps: source.total,
      at: stepWithin(source.index, source.total),
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

export { scrubPlace, stepMarker };
export type { ScrubPlace, ScrubSource };
