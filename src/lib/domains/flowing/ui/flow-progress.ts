import type { Relocation } from 'foliate-js/view.js';
import { languageName } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';

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

function flowMeta(chapter: string | null, language: Language): string {
  const named = languageName(language);
  return chapter === null ? named : `${chapter} · ${named}`;
}

export {
  flowLocation,
  flowMeta,
  flowProgress,
  progressLabel,
  reportedChapter,
  PROGRESS_UNKNOWN_LABEL,
  SCRUB_STEP,
  scrubbedFraction,
};
export type { FlowLocation, FlowProgress };
