import { returnFocus } from '$lib/shared/focus-return';
import type { FocusReturn } from '$lib/shared/focus-return';

function createDetails() {
  let opener: FocusReturn | null = null;

  return {
    remember(from: FocusReturn | null): void {
      opener = from;
    },
    restoreFocus(): void {
      const from = opener;
      opener = null;
      returnFocus(from);
    },
  };
}

export { createDetails };
