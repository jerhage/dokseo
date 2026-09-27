import { describe, expect, it } from 'vitest';
import { searchKey } from './search-keys';
import type { SearchKeyContext, SearchKeyPress } from './search-keys';

function press(key: string, held: Partial<Omit<SearchKeyPress, 'key'>> = {}): SearchKeyPress {
  return {
    key,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    isComposing: false,
    keyCode: 0,
    ...held,
  };
}

const HIDDEN_IN_BOOK: SearchKeyContext = { shown: false, scope: 'book', hasBook: true };

const SHOWN_IN_BOOK: SearchKeyContext = { shown: true, scope: 'book', hasBook: true };

const SHOWN_ON_SHELF: SearchKeyContext = { shown: true, scope: 'all', hasBook: false };

describe('searchKey', () => {
  it('reveals on this book for ⌘K inside a book', () => {
    expect(searchKey(press('k', { metaKey: true }), HIDDEN_IN_BOOK)).toEqual({
      kind: 'reveal',
      scope: 'book',
    });
  });

  it('reveals on every upload for Ctrl+Shift+K inside a book', () => {
    expect(searchKey(press('K', { ctrlKey: true, shiftKey: true }), HIDDEN_IN_BOOK)).toEqual({
      kind: 'reveal',
      scope: 'all',
    });
  });

  it('reveals on every upload for ⌘K outside a book', () => {
    expect(searchKey(press('k', { metaKey: true }), { ...HIDDEN_IN_BOOK, hasBook: false })).toEqual(
      { kind: 'reveal', scope: 'all' },
    );
  });

  it('hides when the shortcut repeats the shown scope', () => {
    expect(searchKey(press('k', { metaKey: true }), SHOWN_IN_BOOK)).toEqual({ kind: 'hide' });
  });

  it('switches scope when the shortcut names the other one', () => {
    expect(searchKey(press('k', { metaKey: true, shiftKey: true }), SHOWN_IN_BOOK)).toEqual({
      kind: 'choose',
      scope: 'all',
    });
  });

  it('ignores a plain k', () => {
    expect(searchKey(press('k'), HIDDEN_IN_BOOK)).toEqual({ kind: 'ignore' });
    expect(searchKey(press('k'), SHOWN_IN_BOOK)).toEqual({ kind: 'ignore' });
  });

  it('ignores every other key while hidden', () => {
    for (const key of ['Escape', 'ArrowDown', 'ArrowUp', 'Enter']) {
      expect(searchKey(press(key), HIDDEN_IN_BOOK)).toEqual({ kind: 'ignore' });
    }
  });

  it('hides on Escape while shown', () => {
    expect(searchKey(press('Escape'), SHOWN_ON_SHELF)).toEqual({ kind: 'hide' });
  });

  it('moves down and up with the arrow keys', () => {
    expect(searchKey(press('ArrowDown'), SHOWN_ON_SHELF)).toEqual({ kind: 'move', by: 1 });
    expect(searchKey(press('ArrowUp'), SHOWN_ON_SHELF)).toEqual({ kind: 'move', by: -1 });
  });

  it('opens in place on Enter and in a new tab with ⌘ or Ctrl held', () => {
    expect(searchKey(press('Enter'), SHOWN_ON_SHELF)).toEqual({ kind: 'open', newTab: false });
    expect(searchKey(press('Enter', { metaKey: true }), SHOWN_ON_SHELF)).toEqual({
      kind: 'open',
      newTab: true,
    });
    expect(searchKey(press('Enter', { ctrlKey: true }), SHOWN_ON_SHELF)).toEqual({
      kind: 'open',
      newTab: true,
    });
  });

  it('ignores typing while shown', () => {
    expect(searchKey(press('a'), SHOWN_ON_SHELF)).toEqual({ kind: 'ignore' });
  });

  it('ignores every command key while an IME composes', () => {
    for (const key of ['Enter', 'Escape', 'ArrowDown', 'ArrowUp']) {
      expect(searchKey(press(key, { isComposing: true }), SHOWN_ON_SHELF)).toEqual({
        kind: 'ignore',
      });
    }
  });

  it('ignores the IME process key code 229 that Safari sends for a confirming Enter', () => {
    for (const key of ['Enter', 'Escape', 'ArrowDown', 'ArrowUp']) {
      expect(searchKey(press(key, { keyCode: 229 }), SHOWN_ON_SHELF)).toEqual({
        kind: 'ignore',
      });
    }
  });

  it('ignores the shortcut while an IME composes', () => {
    expect(searchKey(press('k', { metaKey: true, isComposing: true }), HIDDEN_IN_BOOK)).toEqual({
      kind: 'ignore',
    });
  });
});
