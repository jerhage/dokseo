declare module 'foliate-js/overlayer.js' {
  interface HighlightRect {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly width: number;
    readonly height: number;
  }

  interface HighlightOptions {
    readonly color: string;
  }

  const Overlayer: {
    highlight(rects: readonly HighlightRect[], options: HighlightOptions): SVGElement;
  };

  export { Overlayer };
  export type { HighlightOptions, HighlightRect };
}
