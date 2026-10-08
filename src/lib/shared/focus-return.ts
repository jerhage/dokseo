const FOCUSABLE_PART = 'a[href], button';

type FocusTarget = {
  readonly isConnected: boolean;
  focus(options?: FocusOptions): void;
};

type FocusSource = FocusTarget & {
  readonly tabIndex: number;
  querySelector(selectors: string): FocusTarget | null;
};

type FocusReturn = { readonly target: FocusTarget; readonly pointer: boolean };

function isFocusSource(value: unknown): value is FocusSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    'focus' in value &&
    typeof value.focus === 'function' &&
    'isConnected' in value &&
    'tabIndex' in value &&
    typeof value.tabIndex === 'number' &&
    'querySelector' in value &&
    typeof value.querySelector === 'function'
  );
}

function focusReturnFor(opener: unknown, detail: number): FocusReturn | null {
  if (!isFocusSource(opener)) return null;
  const target = opener.tabIndex >= 0 ? opener : opener.querySelector(FOCUSABLE_PART);
  if (target === null) return null;
  return { target, pointer: detail > 0 };
}

function returnFocus(to: FocusReturn | null): void {
  if (to === null || !to.target.isConnected) return;
  if (to.pointer) to.target.focus({ focusVisible: false });
  else to.target.focus();
}

export { focusReturnFor, returnFocus };
export type { FocusReturn, FocusSource, FocusTarget };
