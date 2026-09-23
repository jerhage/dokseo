// foliate-js ships no type declarations of any kind: its package `exports` is
// { "./*.js": "./*.js" } and there is no .d.ts anywhere in the package, so
// svelte-check, which runs strict here, fails on every import until the modules
// are declared. Only the modules and members this app calls are declared: a
// wildcard module declaration would turn every foliate import into `any` and
// hide a wrong call until a browser proved it. The reasoning in full — and why a
// missing export means reaching for the git pin rather than widening a type — is
// in .local/epub.md, under "The ambient declarations, and why they exist".

declare module 'foliate-js/view.js' {
  interface ResourceDetail {
    data: string | Promise<string | Blob>;
    readonly type: string;
    readonly name: string;
  }

  interface ResourceEvent {
    readonly detail: ResourceDetail;
  }

  interface TransformTarget {
    addEventListener(type: 'data', listener: (event: ResourceEvent) => void): void;
  }

  interface ManifestItem {
    mediaType?: string | null;
  }

  interface BookResources {
    getItemByHref(href: string): ManifestItem | undefined;
  }

  interface BookSection {
    id: string;
    linear?: string | null;
    createDocument?: () => Promise<Document>;
  }

  interface FoliateBook {
    toc?: TocItem[] | null;
    dir?: string | null;
    sections: BookSection[];
    resources: BookResources;
    transformTarget: TransformTarget;
    destroy(): void;
  }

  interface ChapterLoad {
    doc: Document;
    index: number;
  }

  interface TocItem {
    label?: string | null;
    href?: string | null;
    subitems?: TocItem[] | null;
  }

  interface Relocation {
    cfi: string;
    fraction?: number;
    tocItem?: TocItem | null;
  }

  interface FractionTarget {
    fraction: number;
  }

  interface ResolvedTarget {
    index: number;
  }

  interface ViewEventMap {
    load: CustomEvent<ChapterLoad>;
    relocate: CustomEvent<Relocation>;
  }

  class View extends HTMLElement {
    open(book: FoliateBook): Promise<void>;
    goTo(target: number | string | FractionTarget): Promise<unknown>;
    getCFI(index: number, range?: Range): string;
    resolveNavigation(target: number | string | FractionTarget): ResolvedTarget | undefined;
    goLeft(): Promise<void>;
    goRight(): Promise<void>;
    prev(distance?: number): Promise<void>;
    next(distance?: number): Promise<void>;
    getSectionFractions(): number[];
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
  export type {
    BookResources,
    BookSection,
    ChapterLoad,
    FoliateBook,
    FractionTarget,
    ManifestItem,
    Relocation,
    ResolvedTarget,
    ResourceDetail,
    ResourceEvent,
    TocItem,
    TransformTarget,
    ViewEventMap,
  };
}
