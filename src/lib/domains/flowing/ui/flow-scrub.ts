import { PROGRESS_UNKNOWN_LABEL, progressLabel, SCRUB_STEP } from './flow-progress';
import type { FlowProgress } from './flow-progress';

type FlowScrub = {
  readonly steps: number;
  readonly at: number;
};

const LAST_STEP = Math.round(1 / SCRUB_STEP);

const NOWHERE_TO_SCRUB: FlowScrub = { steps: 0, at: 0 };

function flowScrub(progress: FlowProgress): FlowScrub {
  if (progress.kind === 'unknown') return NOWHERE_TO_SCRUB;

  return { steps: LAST_STEP + 1, at: Math.round(progress.fraction * LAST_STEP) };
}

function scrubbedFractionAt(step: number): number {
  return step / LAST_STEP;
}

function scrubMarker(progress: FlowProgress, step: number): string {
  if (progress.kind === 'unknown') return PROGRESS_UNKNOWN_LABEL;
  if (step === flowScrub(progress).at) return progressLabel(progress);

  return `${Math.round(scrubbedFractionAt(step) * 100)}%`;
}

export { flowScrub, LAST_STEP, NOWHERE_TO_SCRUB, scrubbedFractionAt, scrubMarker };
export type { FlowScrub };
