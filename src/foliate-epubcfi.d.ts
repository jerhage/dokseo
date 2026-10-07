declare module 'foliate-js/epubcfi.js' {
  type CfiNode = {
    readonly nodeType: number;
    readonly nodeValue: string | null;
    readonly parentNode: CfiNode | null;
    readonly childNodes: ArrayLike<CfiNode>;
    readonly ownerDocument: { readonly documentElement: CfiNode } | null;
  };

  type CfiRange = {
    readonly startContainer: CfiNode;
    readonly startOffset: number;
    readonly endContainer: CfiNode;
    readonly endOffset: number;
    readonly collapsed: boolean;
  };

  function compare(earlier: string, later: string): number;

  function fromRange(range: CfiRange): string;

  function joinIndir(...cfis: string[]): string;

  export { compare, fromRange, joinIndir };
}
