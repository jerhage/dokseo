import { clampStep, lastStep } from './step-through';

type StepThroughOptions = {
  readonly count: () => number;
  readonly initial?: number;
};

type StepThroughState = {
  readonly index: number;
  readonly atFirst: boolean;
  readonly atLast: boolean;
  next(): void;
  previous(): void;
};

function createStepThrough(options: StepThroughOptions): StepThroughState {
  let requested = $state(options.initial ?? 0);
  const index = $derived(clampStep(requested, options.count()));

  return {
    get index() {
      return index;
    },
    get atFirst() {
      return index === 0;
    },
    get atLast() {
      return index >= lastStep(options.count());
    },
    next() {
      requested = clampStep(index + 1, options.count());
    },
    previous() {
      requested = clampStep(index - 1, options.count());
    },
  };
}

export { createStepThrough };
export type { StepThroughOptions, StepThroughState };
