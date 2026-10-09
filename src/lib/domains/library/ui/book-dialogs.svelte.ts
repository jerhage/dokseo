import type { BookId } from '$lib/shared/ids';

function createBookDialogs() {
  let settingsFor = $state<BookId | null>(null);
  let removeFor = $state<BookId | null>(null);
  let deleteCapturesFor = $state<BookId | null>(null);

  return {
    get settingsFor(): BookId | null {
      return settingsFor;
    },
    get removeFor(): BookId | null {
      return removeFor;
    },
    get deleteCapturesFor(): BookId | null {
      return deleteCapturesFor;
    },
    openSettings(id: BookId): void {
      settingsFor = id;
    },
    closeSettings(): void {
      settingsFor = null;
    },
    openRemove(id: BookId): void {
      removeFor = id;
    },
    closeRemove(): void {
      removeFor = null;
    },
    openDeleteCaptures(id: BookId): void {
      deleteCapturesFor = id;
    },
    closeDeleteCaptures(): void {
      deleteCapturesFor = null;
    },
  };
}

export { createBookDialogs };
