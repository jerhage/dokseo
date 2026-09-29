import type { ImageRegion } from './image-region';

type TextQuote = {
  readonly exact: string;
  readonly prefix: string;
  readonly suffix: string;
};

type TextAnchor = {
  readonly kind: 'text';
  readonly cfi: string;
  readonly quote: TextQuote;
  readonly chapter: string | null;
};

type SoughtPassage = {
  readonly cfi: string;
  readonly quote: TextQuote | null;
};

type Anchor = { readonly kind: 'region'; readonly regions: readonly ImageRegion[] } | TextAnchor;

function regionAnchor(regions: readonly ImageRegion[]): Anchor {
  return { kind: 'region', regions };
}

function textAnchor(cfi: string, quote: TextQuote, chapter: string | null): Anchor {
  return { kind: 'text', cfi, quote, chapter };
}

function sameAnchorKind(left: Anchor, right: Anchor): boolean {
  return left.kind === right.kind;
}

export { regionAnchor, sameAnchorKind, textAnchor };
export type { Anchor, SoughtPassage, TextAnchor, TextQuote };
