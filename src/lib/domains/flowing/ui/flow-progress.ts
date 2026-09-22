import type { Relocation } from 'foliate-js/view.js';
import { languageName } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import type { ReadingDirection } from '$lib/shared/layout-kind';

type FlowLocation = {
  readonly cfi: string;
  readonly fraction: number | null;
  readonly chapter: string | null;
};

type FlowProgress =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'known'; readonly fraction: number; readonly percent: number };

const NOTHING_TO_REPORT: FlowProgress = { kind: 'unknown' };

const PROGRESS_UNKNOWN_LABEL = 'Progress unknown';

const SCRUB_STEP = 0.001;

const NO_CHAPTER_TICKS: readonly number[] = [];

const MAX_CHAPTER_TICKS = 40;

const TICK_EDGE_MARGIN = 0.01;

const TICK_OFFSET_DECIMALS = 2;

function reportedFraction(fraction: number | undefined): number | null {
  if (fraction === undefined || !Number.isFinite(fraction)) return null;

  return Math.min(1, Math.max(0, fraction));
}

function reportedChapter(label: string | null | undefined): string | null {
  if (label === undefined || label === null) return null;

  const named = label.replace(/\s+/gu, ' ').trim();
  return named.length === 0 ? null : named;
}

function flowLocation(at: Relocation): FlowLocation {
  return {
    cfi: at.cfi,
    fraction: reportedFraction(at.fraction),
    chapter: reportedChapter(at.tocItem?.label),
  };
}

function flowProgress(location: FlowLocation | null): FlowProgress {
  const fraction = location?.fraction ?? null;
  if (fraction === null) return NOTHING_TO_REPORT;

  return { kind: 'known', fraction, percent: Math.round(fraction * 100) };
}

function progressLabel(progress: FlowProgress): string {
  return progress.kind === 'unknown' ? PROGRESS_UNKNOWN_LABEL : `${progress.percent}%`;
}

function scrubbedFraction(progress: FlowProgress, asked: number): number | null {
  if (progress.kind === 'unknown') return null;
  if (!Number.isFinite(asked)) return null;

  return Math.min(1, Math.max(0, asked));
}

function insideTheBar(fraction: number): boolean {
  if (!Number.isFinite(fraction)) return false;

  return fraction > TICK_EDGE_MARGIN && fraction < 1 - TICK_EDGE_MARGIN;
}

function chapterTicks(fractions: readonly number[] | null | undefined): readonly number[] {
  if (fractions === undefined || fractions === null) return NO_CHAPTER_TICKS;

  const marked = [...new Set(fractions.filter(insideTheBar))].toSorted((one, other) => one - other);
  return marked.length > MAX_CHAPTER_TICKS ? NO_CHAPTER_TICKS : marked;
}

function tickOffsets(ticks: readonly number[], direction: ReadingDirection): readonly number[] {
  return ticks.map((tick) => {
    const fromTheLeftEdge = direction === 'rtl' ? 1 - tick : tick;
    return Number((fromTheLeftEdge * 100).toFixed(TICK_OFFSET_DECIMALS));
  });
}

function flowMeta(chapter: string | null, language: Language): string {
  const named = languageName(language);
  return chapter === null ? named : `${chapter} · ${named}`;
}

export {
  chapterTicks,
  flowLocation,
  flowMeta,
  flowProgress,
  MAX_CHAPTER_TICKS,
  NO_CHAPTER_TICKS,
  progressLabel,
  reportedChapter,
  PROGRESS_UNKNOWN_LABEL,
  SCRUB_STEP,
  scrubbedFraction,
  TICK_EDGE_MARGIN,
  tickOffsets,
};
export type { FlowLocation, FlowProgress };
