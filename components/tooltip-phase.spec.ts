import { describe, expect, it } from 'vitest';
import { tooltipShown, tooltipStep } from './tooltip-phase';
import type { TooltipEvent, TooltipPhase } from './tooltip-phase';

function after(events: readonly TooltipEvent[]): TooltipPhase {
  return events.reduce<TooltipPhase>((phase, event) => tooltipStep(phase, event).phase, 'hidden');
}

describe('tooltipStep', () => {
  it('waits before showing a hovered tooltip, and shows it once the wait ends', () => {
    expect(tooltipStep('hidden', 'enter')).toEqual({ phase: 'waiting', effect: 'wait' });
    expect(tooltipStep('waiting', 'elapsed')).toEqual({ phase: 'shown', effect: 'show' });
  });

  it('shows a tooltip at once on focus, even while a hover is waiting', () => {
    expect(tooltipStep('hidden', 'focus')).toEqual({ phase: 'shown', effect: 'show' });
    expect(tooltipStep('waiting', 'focus')).toEqual({ phase: 'shown', effect: 'show' });
  });

  it('cancels the wait when the pointer leaves or Escape is pressed before the tooltip shows', () => {
    expect(tooltipStep('waiting', 'leave')).toEqual({ phase: 'hidden', effect: 'cancel' });
    expect(tooltipStep('waiting', 'escape')).toEqual({ phase: 'hidden', effect: 'cancel' });
  });

  it('starts a grace period when the pointer leaves a shown tooltip, and hides it when the period ends', () => {
    expect(tooltipStep('shown', 'leave')).toEqual({ phase: 'leaving', effect: 'grace' });
    expect(tooltipStep('leaving', 'elapsed')).toEqual({ phase: 'hidden', effect: 'hide' });
  });

  it('keeps the tooltip shown when the pointer comes back during the grace period', () => {
    expect(tooltipStep('leaving', 'enter')).toEqual({ phase: 'shown', effect: 'cancel' });
    expect(after(['enter', 'elapsed', 'leave', 'enter', 'elapsed'])).toBe('shown');
  });

  it('hides a shown tooltip at once on blur and on Escape', () => {
    for (const phase of ['shown', 'leaving'] as const) {
      expect(tooltipStep(phase, 'blur')).toEqual({ phase: 'hidden', effect: 'hide' });
      expect(tooltipStep(phase, 'escape')).toEqual({ phase: 'hidden', effect: 'hide' });
    }
  });

  it('keeps a hovered tooltip waiting when focus leaves the trigger', () => {
    expect(tooltipStep('waiting', 'blur')).toEqual({ phase: 'waiting', effect: 'none' });
  });

  it('stays hidden after Escape until the pointer enters again', () => {
    expect(after(['focus', 'escape', 'elapsed', 'leave'])).toBe('hidden');
    expect(after(['focus', 'escape', 'enter'])).toBe('waiting');
  });
});

describe('tooltipShown', () => {
  it('reports the tooltip shown while it is shown or in its grace period', () => {
    expect((['hidden', 'waiting', 'shown', 'leaving'] as const).map(tooltipShown)).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });
});
