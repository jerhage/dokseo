import type { PaletteScope } from './palette-rows';

type PaletteKeyPress = {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
};

type PaletteKeyContext = {
  readonly shown: boolean;
  readonly scope: PaletteScope;
  readonly hasBook: boolean;
};

type PaletteKey =
  | { readonly kind: 'reveal'; readonly scope: PaletteScope }
  | { readonly kind: 'choose'; readonly scope: PaletteScope }
  | { readonly kind: 'hide' }
  | { readonly kind: 'move'; readonly by: 1 | -1 }
  | { readonly kind: 'open'; readonly newTab: boolean }
  | { readonly kind: 'ignore' };

function isShortcut(press: PaletteKeyPress): boolean {
  return press.key.toLowerCase() === 'k' && (press.metaKey || press.ctrlKey);
}

function paletteKey(press: PaletteKeyPress, context: PaletteKeyContext): PaletteKey {
  if (isShortcut(press)) {
    const scope: PaletteScope = !context.hasBook || press.shiftKey ? 'all' : 'book';
    if (!context.shown) return { kind: 'reveal', scope };

    return context.scope === scope ? { kind: 'hide' } : { kind: 'choose', scope };
  }

  if (!context.shown) return { kind: 'ignore' };
  if (press.key === 'Escape') return { kind: 'hide' };
  if (press.key === 'ArrowDown') return { kind: 'move', by: 1 };
  if (press.key === 'ArrowUp') return { kind: 'move', by: -1 };
  if (press.key === 'Enter') return { kind: 'open', newTab: press.metaKey || press.ctrlKey };

  return { kind: 'ignore' };
}

export { paletteKey };
export type { PaletteKey, PaletteKeyContext, PaletteKeyPress };
