// foliate-js ships no type declarations of any kind: its package `exports` is
// { "./*.js": "./*.js" } and there is no .d.ts anywhere in the package, so
// svelte-check, which runs strict here, fails on every import until the modules
// are declared. Only the modules and members this app calls are declared: a
// wildcard module declaration would turn every foliate import into `any` and
// hide a wrong call until a browser proved it. The reasoning in full — and why a
// missing export means reaching for the git pin rather than widening a type — is
// in .local/epub.md, under "The ambient declarations, and why they exist".

declare module 'foliate-js/view.js' {
  interface FoliateBook {
    destroy(): void;
  }

  interface ChapterLoad {
    doc: Document;
    index: number;
  }

  interface ViewEventMap {
    load: CustomEvent<ChapterLoad>;
  }

  class View extends HTMLElement {
    open(book: FoliateBook): Promise<void>;
    goTo(target: number): Promise<unknown>;
    goLeft(): Promise<void>;
    goRight(): Promise<void>;
    prev(distance?: number): Promise<void>;
    next(distance?: number): Promise<void>;
    close(): void;
    readonly renderer: { setStyles(styles: string | readonly [string, string]): void };
    addEventListener<K extends keyof ViewEventMap>(
      type: K,
      listener: (this: View, event: ViewEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void;
  }

  function makeBook(file: File): Promise<FoliateBook>;

  export { View, makeBook };
  export type { ChapterLoad, FoliateBook, ViewEventMap };
}
