import { describe, expect, it } from 'vitest';
import { createDetails } from './details-focus';

function target() {
  const calls: (FocusOptions | undefined)[] = [];
  return {
    calls,
    focusable: {
      isConnected: true,
      focus: (options?: FocusOptions) => void calls.push(options),
    },
  };
}

describe('createDetails', () => {
  it('returns focus to the card that opened the details once, with the ring only after the keyboard', () => {
    const { calls, focusable } = target();
    const details = createDetails();
    details.remember({ target: focusable, pointer: false });

    details.restoreFocus();
    details.restoreFocus();

    expect(calls).toEqual([undefined]);
  });

  it('hides the focus ring after a pointer', () => {
    const { calls, focusable } = target();
    const details = createDetails();
    details.remember({ target: focusable, pointer: true });

    details.restoreFocus();

    expect(calls).toEqual([{ focusVisible: false }]);
  });

  it('focuses nothing when nothing was remembered', () => {
    const details = createDetails();

    expect(() => details.restoreFocus()).not.toThrow();
  });
});
