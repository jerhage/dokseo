import { returnFocus } from '$lib/shared/focus-return';
import type { FocusReturn } from '$lib/shared/focus-return';
import type { BookId } from '$lib/shared/ids';

type DetailsHooks = {
  readonly opened: (id: BookId) => void;
  readonly closed: () => void;
};

const NO_HOOKS: DetailsHooks = { opened: () => undefined, closed: () => undefined };

function createBookDetails(hooks: DetailsHooks = NO_HOOKS) {
  let openId = $state<BookId | null>(null);
  let openFrom: FocusReturn | null = null;

  function hide(): void {
    openId = null;
    returnFocus(openFrom);
    openFrom = null;
  }

  return {
    get openId(): BookId | null {
      return openId;
    },
    open(id: BookId, from: FocusReturn | null = null): void {
      openId = id;
      openFrom = from;
      hooks.opened(id);
    },
    close(): void {
      hide();
      hooks.closed();
    },
    show(id: BookId): void {
      openId = id;
    },
    hide,
  };
}

type BookDetailsHook = ReturnType<typeof createBookDetails>;

export { createBookDetails };
export type { BookDetailsHook, DetailsHooks };
