type FocusHolder = {
  blur(): void;
};

type Bar<T> = {
  contains(node: T): boolean;
};

type ReadingSurface = {
  focus(options?: FocusOptions): void;
};

const QUIET_FOCUS: FocusOptions = { preventScroll: true, focusVisible: false };

function returnFocusToPage<T extends FocusHolder>(
  focused: T | null,
  bars: readonly (Bar<NoInfer<T>> | null)[],
  surface: ReadingSurface | null,
): void {
  if (focused === null) return;
  if (!bars.some((bar) => bar?.contains(focused) ?? false)) return;

  focused.blur();
  surface?.focus(QUIET_FOCUS);
}

export { QUIET_FOCUS, returnFocusToPage };
export type { Bar, FocusHolder, ReadingSurface };
