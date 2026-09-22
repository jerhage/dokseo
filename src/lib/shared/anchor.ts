import type { ImageRegion } from './image-region';

type TextQuote = {
  readonly exact: string;
  readonly prefix: string;
  readonly suffix: string;
};

type Anchor =
  | { readonly kind: 'region'; readonly regions: readonly ImageRegion[] }
  | { readonly kind: 'text'; readonly cfi: string; readonly quote: TextQuote };

function regionAnchor(regions: readonly ImageRegion[]): Anchor {
  return { kind: 'region', regions };
}

function textAnchor(cfi: string, quote: TextQuote): Anchor {
  return { kind: 'text', cfi, quote };
}

function sameAnchorKind(left: Anchor, right: Anchor): boolean {
  return left.kind === right.kind;
}

export { regionAnchor, sameAnchorKind, textAnchor };
export type { Anchor, TextQuote };
