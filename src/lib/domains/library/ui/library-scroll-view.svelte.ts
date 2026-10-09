import { untrack } from 'svelte';
import { match } from 'ts-pattern';
import type { LibraryBody } from './library-shelf';
import { returnsFromReader, scrollStep, scrollTopFrom } from './library-scroll';
import type { ScrollStep } from './library-scroll';

type ScrollMemory = { top: number | null };

const TAB_MEMORY: ScrollMemory = { top: null };

function createLibraryScroll(memory: ScrollMemory = TAB_MEMORY) {
  let pending = $state<number | null>(null);
  let top = 0;

  function restore(value: unknown): void {
    const restored = scrollTopFrom(value);
    if (restored !== null) pending = restored;
  }

  function finish(next: number | null): number | null {
    pending = null;
    return next;
  }

  function consume(step: ScrollStep): number | null {
    return match(step)
      .with({ kind: 'wait' }, () => null)
      .with({ kind: 'scroll' }, (scroll) => finish(scroll.top))
      .with({ kind: 'none' }, () => finish(null))
      .exhaustive();
  }

  return {
    track(next: number): void {
      top = next;
    },
    capture(): number {
      memory.top = top;
      return top;
    },
    restore,
    arrive(navigation: string, from: string | null): void {
      if (returnsFromReader(navigation, from)) restore(memory.top);
    },
    settle(body: LibraryBody): number | null {
      const step = scrollStep(pending, body);
      return untrack(() => consume(step));
    },
  };
}

type LibraryScrollHook = ReturnType<typeof createLibraryScroll>;

export { createLibraryScroll };
export type { LibraryScrollHook, ScrollMemory };
