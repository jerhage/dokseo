import { returnFocus } from '$lib/shared/focus-return';
import type { FocusReturn } from '$lib/shared/focus-return';
import type { BookId } from '$lib/shared/ids';

type DetailsHooks = {
  readonly shown: () => BookId | null;
  readonly opened: (id: BookId) => void;
  readonly closed: () => void;
};

function createBookDetails(hooks: DetailsHooks) {
  let openFrom: FocusReturn | null = null;

  function hide(): void {
    returnFocus(openFrom);
    openFrom = null;
  }

  return {
    get openId(): BookId | null {
      return hooks.shown();
    },
    open(id: BookId, from: FocusReturn | null = null): void {
      openFrom = from;
      hooks.opened(id);
    },
    close(): void {
      hide();
      hooks.closed();
    },
    hide,
  };
}

type BookDetailsHook = ReturnType<typeof createBookDetails>;

export { createBookDetails };
export type { BookDetailsHook, DetailsHooks };
