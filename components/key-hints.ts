import { match } from 'ts-pattern';
import type { ClassList } from './classes';

type KeyHint = {
  readonly keys: readonly string[];
  readonly does: string;
};

type KeyHintsVariant = 'chips' | 'inline' | 'text';

type HintPiece =
  | { readonly kind: 'key'; readonly text: string }
  | { readonly kind: 'words'; readonly text: string };

type HintsBody =
  | { readonly kind: 'chips' }
  | { readonly kind: 'inline'; readonly pieces: readonly HintPiece[] }
  | { readonly kind: 'text'; readonly text: string };

type KeyHintsSize = 'sm' | 'md';

type KeyHintsElement = 'p' | 'span' | 'div' | 'footer';

const KEY_HINTS_VARIANTS: Readonly<Record<KeyHintsVariant, ClassList>> = {
  chips: ['key-hints-chips'],
  inline: [],
  text: [],
};

const KEY_HINTS_SIZES: Readonly<Record<KeyHintsSize, ClassList>> = {
  sm: ['key-hints-sm'],
  md: [],
};

const KEY_JOINER = '+';

const HINT_SEPARATOR = ' · ';

function hintText(hints: readonly KeyHint[]): string {
  return hints
    .map((hint) => `${hint.keys.join(` ${KEY_JOINER} `)} ${hint.does}`)
    .join(HINT_SEPARATOR);
}

function keyPiece(text: string): HintPiece {
  return { kind: 'key', text };
}

function wordsPiece(text: string): HintPiece {
  return { kind: 'words', text };
}

function hintPieces(hints: readonly KeyHint[]): readonly HintPiece[] {
  return hints.flatMap((hint, place) => [
    ...(place > 0 ? [wordsPiece(HINT_SEPARATOR)] : []),
    ...hint.keys.flatMap((key, step) => [
      ...(step > 0 ? [wordsPiece(` ${KEY_JOINER} `)] : []),
      keyPiece(key),
    ]),
    wordsPiece(` ${hint.does}`),
  ]);
}

function hintsBody(variant: KeyHintsVariant, hints: readonly KeyHint[]): HintsBody {
  return match(variant)
    .returnType<HintsBody>()
    .with('chips', () => ({ kind: 'chips' }))
    .with('inline', () => ({ kind: 'inline', pieces: hintPieces(hints) }))
    .with('text', () => ({ kind: 'text', text: hintText(hints) }))
    .exhaustive();
}

export {
  HINT_SEPARATOR,
  KEY_HINTS_SIZES,
  KEY_HINTS_VARIANTS,
  KEY_JOINER,
  hintPieces,
  hintText,
  hintsBody,
};
export type { HintPiece, HintsBody, KeyHint, KeyHintsElement, KeyHintsSize, KeyHintsVariant };
