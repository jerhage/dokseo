import { match } from 'ts-pattern';

type Step = string | (() => void) | null;

type StepperSteps = {
  readonly previous: Step;
  readonly next: Step;
  readonly count: string | null;
};

type StepperAxis = 'inline' | 'block';

type StepperEnds = 'disabled' | 'hidden';

type StepperTally = 'badge' | 'status';

type StepperArrow = 'left' | 'right' | 'up' | 'down';

type StepperArrows = {
  readonly previous: StepperArrow;
  readonly next: StepperArrow;
};

type StepFace =
  | { readonly kind: 'link'; readonly href: string }
  | { readonly kind: 'action'; readonly run: () => void }
  | { readonly kind: 'disabled' }
  | { readonly kind: 'hidden' };

function stepFace(step: Step, ends: StepperEnds): StepFace {
  if (typeof step === 'string') return { kind: 'link', href: step };
  if (typeof step === 'function') return { kind: 'action', run: step };

  return match<StepperEnds, StepFace>(ends)
    .with('disabled', () => ({ kind: 'disabled' }))
    .with('hidden', () => ({ kind: 'hidden' }))
    .exhaustive();
}

function stepperArrows(axis: StepperAxis): StepperArrows {
  return match<StepperAxis, StepperArrows>(axis)
    .with('inline', () => ({ previous: 'left', next: 'right' }))
    .with('block', () => ({ previous: 'up', next: 'down' }))
    .exhaustive();
}

export { stepFace, stepperArrows };
export type {
  Step,
  StepFace,
  StepperArrow,
  StepperArrows,
  StepperAxis,
  StepperEnds,
  StepperSteps,
  StepperTally,
};
