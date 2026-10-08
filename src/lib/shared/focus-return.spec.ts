import { describe, expect, it } from 'vitest';
import { focusReturnFor, returnFocus } from './focus-return';
import type { FocusSource, FocusTarget } from './focus-return';

function target(connected = true): FocusTarget & { readonly calls: (FocusOptions | undefined)[] } {
  const calls: (FocusOptions | undefined)[] = [];
  return {
    calls,
    isConnected: connected,
    focus: (options) => {
      calls.push(options);
    },
  };
}

function source(tabIndex: number, inner: FocusTarget | null): FocusSource {
  return { ...target(), tabIndex, querySelector: () => inner };
}

describe('focusReturnFor', () => {
  it('takes the opener itself when it is focusable', () => {
    const button = source(0, null);
    expect(focusReturnFor(button, 1)).toEqual({ target: button, pointer: true });
  });

  it('takes the focusable part inside an opener that is not focusable', () => {
    const link = target();
    expect(focusReturnFor(source(-1, link), 1)?.target).toBe(link);
  });

  it('reports nothing for a non-focusable opener with no focusable part', () => {
    expect(focusReturnFor(source(-1, null), 1)).toBeNull();
  });

  it('reports a click with no pointer detail as a keyboard activation', () => {
    expect(focusReturnFor(source(0, null), 0)?.pointer).toBe(false);
  });

  it.each([[null], [undefined], [{}], [{ focus: () => {} }]])(
    'reports nothing for %j, which is not an element',
    (opener) => {
      expect(focusReturnFor(opener, 1)).toBeNull();
    },
  );
});

describe('returnFocus', () => {
  it('focuses a pointer opener without the focus ring', () => {
    const button = target();
    returnFocus({ target: button, pointer: true });
    expect(button.calls).toEqual([{ focusVisible: false }]);
  });

  it('focuses a keyboard opener with the default ring behaviour', () => {
    const button = target();
    returnFocus({ target: button, pointer: false });
    expect(button.calls).toEqual([undefined]);
  });

  it('leaves a detached opener alone', () => {
    const button = target(false);
    returnFocus({ target: button, pointer: false });
    expect(button.calls).toEqual([]);
  });

  it('does nothing without an opener', () => {
    expect(() => returnFocus(null)).not.toThrow();
  });
});
