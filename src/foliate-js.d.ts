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

  class View extends HTMLElement {
    open(book: FoliateBook): Promise<void>;
    goTo(target: number): Promise<unknown>;
    close(): void;
  }

  function makeBook(file: File): Promise<FoliateBook>;

  export { View, makeBook };
  export type { FoliateBook };
}
