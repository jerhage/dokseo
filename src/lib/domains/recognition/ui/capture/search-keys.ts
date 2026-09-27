import { isComposingKey } from '$lib/shared/composing-key';
import type { SearchScope } from './search-rows';

type SearchKeyPress = {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly isComposing: boolean;
  readonly keyCode: number;
};

type SearchKeyContext = {
  readonly shown: boolean;
  readonly scope: SearchScope;
  readonly hasBook: boolean;
};

type SearchKey =
  | { readonly kind: 'reveal'; readonly scope: SearchScope }
  | { readonly kind: 'choose'; readonly scope: SearchScope }
  | { readonly kind: 'hide' }
  | { readonly kind: 'move'; readonly by: 1 | -1 }
  | { readonly kind: 'open'; readonly newTab: boolean }
  | { readonly kind: 'ignore' };

function isShortcut(press: SearchKeyPress): boolean {
  return press.key.toLowerCase() === 'k' && (press.metaKey || press.ctrlKey);
}

function searchKey(press: SearchKeyPress, context: SearchKeyContext): SearchKey {
  if (isComposingKey(press)) return { kind: 'ignore' };

  if (isShortcut(press)) {
    const scope: SearchScope = !context.hasBook || press.shiftKey ? 'all' : 'book';
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

export { searchKey };
export type { SearchKey, SearchKeyContext, SearchKeyPress };
