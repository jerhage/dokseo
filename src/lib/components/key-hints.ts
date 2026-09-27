import type { ClassList } from './classes';

type KeyHint = {
  readonly keys: readonly string[];
  readonly does: string;
};

type KeyHintsVariant = 'chips' | 'text';

type KeyHintsSize = 'sm' | 'md';

type KeyHintsElement = 'p' | 'span' | 'div' | 'footer';

const KEY_HINTS_VARIANTS: Readonly<Record<KeyHintsVariant, ClassList>> = {
  chips: ['key-hints-chips'],
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

export { HINT_SEPARATOR, KEY_HINTS_SIZES, KEY_HINTS_VARIANTS, KEY_JOINER, hintText };
export type { KeyHint, KeyHintsElement, KeyHintsSize, KeyHintsVariant };
