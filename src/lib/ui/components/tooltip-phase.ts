import { match } from 'ts-pattern';

type TooltipPhase = 'hidden' | 'waiting' | 'shown' | 'leaving';

type TooltipEvent = 'enter' | 'leave' | 'focus' | 'blur' | 'escape' | 'elapsed';

type TooltipEffect = 'none' | 'wait' | 'show' | 'grace' | 'hide' | 'cancel';

type TooltipStep = {
  readonly phase: TooltipPhase;
  readonly effect: TooltipEffect;
};

const TOOLTIP_SHOW_DELAY_MS = 400;

const TOOLTIP_HIDE_GRACE_MS = 100;

function step(phase: TooltipPhase, effect: TooltipEffect): TooltipStep {
  return { phase, effect };
}

function tooltipShown(phase: TooltipPhase): boolean {
  return phase === 'shown' || phase === 'leaving';
}

function tooltipStep(phase: TooltipPhase, event: TooltipEvent): TooltipStep {
  return match([phase, event] as const)
    .returnType<TooltipStep>()
    .with(['hidden', 'enter'], () => step('waiting', 'wait'))
    .with(['hidden', 'focus'], ['waiting', 'focus'], ['waiting', 'elapsed'], () =>
      step('shown', 'show'),
    )
    .with(['waiting', 'leave'], ['waiting', 'escape'], () => step('hidden', 'cancel'))
    .with(['shown', 'leave'], () => step('leaving', 'grace'))
    .with(['leaving', 'enter'], ['leaving', 'focus'], () => step('shown', 'cancel'))
    .with(
      ['shown', 'blur'],
      ['shown', 'escape'],
      ['leaving', 'blur'],
      ['leaving', 'escape'],
      ['leaving', 'elapsed'],
      () => step('hidden', 'hide'),
    )
    .with(
      ['hidden', 'leave'],
      ['hidden', 'blur'],
      ['hidden', 'escape'],
      ['hidden', 'elapsed'],
      ['waiting', 'enter'],
      ['waiting', 'blur'],
      ['shown', 'enter'],
      ['shown', 'focus'],
      ['shown', 'elapsed'],
      ['leaving', 'leave'],
      ([current]) => step(current, 'none'),
    )
    .exhaustive();
}

export { TOOLTIP_HIDE_GRACE_MS, TOOLTIP_SHOW_DELAY_MS, tooltipShown, tooltipStep };
export type { TooltipEffect, TooltipEvent, TooltipPhase, TooltipStep };
