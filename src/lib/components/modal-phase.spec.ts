import { describe, expect, it } from 'vitest';
import { modalStep } from './modal-phase';

describe('modalStep', () => {
  it('opens a closed modal as a modal dialog', () => {
    expect(modalStep('closed', 'show')).toEqual({ phase: 'open', effect: 'show-modal' });
  });

  it('starts the leaving animation when an open modal is hidden', () => {
    expect(modalStep('open', 'hide')).toEqual({ phase: 'leaving', effect: 'start-leaving' });
  });

  it('closes the dialog once the leaving animation ends', () => {
    expect(modalStep('leaving', 'left')).toEqual({ phase: 'closed', effect: 'close' });
  });

  it('keeps a leaving modal on screen when it is shown again', () => {
    expect(modalStep('leaving', 'show')).toEqual({ phase: 'open', effect: 'none' });
  });

  it('ignores the end of a leaving animation that a reopen cut short', () => {
    expect(modalStep('open', 'left')).toEqual({ phase: 'open', effect: 'none' });
  });

  it('starts only one leaving animation for a second hide', () => {
    expect(modalStep('leaving', 'hide')).toEqual({ phase: 'leaving', effect: 'none' });
  });

  it('shows an open modal only once', () => {
    expect(modalStep('open', 'show')).toEqual({ phase: 'open', effect: 'none' });
  });

  it('follows a dialog the browser closed on its own, from any phase', () => {
    expect([
      modalStep('open', 'closed'),
      modalStep('leaving', 'closed'),
      modalStep('closed', 'closed'),
    ]).toEqual([
      { phase: 'closed', effect: 'none' },
      { phase: 'closed', effect: 'none' },
      { phase: 'closed', effect: 'none' },
    ]);
  });

  it('does nothing to a closed modal that is hidden or reports a late animation end', () => {
    expect([modalStep('closed', 'hide'), modalStep('closed', 'left')]).toEqual([
      { phase: 'closed', effect: 'none' },
      { phase: 'closed', effect: 'none' },
    ]);
  });
});
