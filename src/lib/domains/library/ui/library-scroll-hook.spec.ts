import { describe, expect, it } from 'vitest';
import { READER_ROUTE } from './library-scroll';
import { createLibraryScroll } from './library-scroll-view.svelte';
import type { LibraryScrollHook, ScrollMemory } from './library-scroll-view.svelte';

function fresh(): { readonly memory: ScrollMemory; readonly view: LibraryScrollHook } {
  const memory: ScrollMemory = { top: null };
  return { memory, view: createLibraryScroll(memory) };
}

describe('createLibraryScroll', () => {
  it('captures the last tracked offset and remembers it for the tab', () => {
    const { memory, view } = fresh();
    view.track(120);
    view.track(640);

    expect(view.capture()).toBe(640);
    expect(memory.top).toBe(640);
  });

  it('holds a restored snapshot until the books are listed, then scrolls to it once', () => {
    const { view } = fresh();
    view.restore(640);

    expect(view.settle('reading')).toBeNull();
    expect(view.settle('listed')).toBe(640);
    expect(view.settle('listed')).toBeNull();
  });

  it.each([
    { snapshot: 'a string snapshot', arrive: (view: LibraryScrollHook) => view.restore('640') },
    {
      snapshot: 'a link from the reader with nothing remembered',
      arrive: (view: LibraryScrollHook) => view.arrive('link', READER_ROUTE),
    },
  ])('ignores $snapshot, which is not an offset, and starts at the top', ({ arrive }) => {
    const { view } = fresh();
    arrive(view);

    expect(view.settle('listed')).toBeNull();
  });

  it('drops a pending offset when the library turns out empty', () => {
    const { view } = fresh();
    view.restore(640);

    expect(view.settle('empty')).toBeNull();
    expect(view.settle('listed')).toBeNull();
  });

  it('returns to the remembered offset after a link from the reader', () => {
    const { memory, view } = fresh();
    memory.top = 910;
    view.arrive('link', READER_ROUTE);

    expect(view.settle('listed')).toBe(910);
  });

  it('starts at the top after a link from anywhere else', () => {
    const { memory, view } = fresh();
    memory.top = 910;
    view.arrive('link', '/settings');

    expect(view.settle('listed')).toBeNull();
  });
});
