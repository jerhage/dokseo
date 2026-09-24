import { describe, expect, it } from 'vitest';
import { paletteKey } from './palette-keys';
import type { PaletteKeyContext, PaletteKeyPress } from './palette-keys';

function press(key: string, held: Partial<Omit<PaletteKeyPress, 'key'>> = {}): PaletteKeyPress {
  return { key, metaKey: false, ctrlKey: false, shiftKey: false, ...held };
}

const HIDDEN_IN_BOOK: PaletteKeyContext = { shown: false, scope: 'book', hasBook: true };

const SHOWN_IN_BOOK: PaletteKeyContext = { shown: true, scope: 'book', hasBook: true };

const SHOWN_ON_SHELF: PaletteKeyContext = { shown: true, scope: 'all', hasBook: false };

describe('paletteKey', () => {
  it('reveals on this book for ⌘K inside a book', () => {
    expect(paletteKey(press('k', { metaKey: true }), HIDDEN_IN_BOOK)).toEqual({
      kind: 'reveal',
      scope: 'book',
    });
  });

  it('reveals on every upload for Ctrl+Shift+K inside a book', () => {
    expect(paletteKey(press('K', { ctrlKey: true, shiftKey: true }), HIDDEN_IN_BOOK)).toEqual({
      kind: 'reveal',
      scope: 'all',
    });
  });

  it('reveals on every upload for ⌘K outside a book', () => {
    expect(
      paletteKey(press('k', { metaKey: true }), { ...HIDDEN_IN_BOOK, hasBook: false }),
    ).toEqual({ kind: 'reveal', scope: 'all' });
  });

  it('hides when the shortcut repeats the shown scope', () => {
    expect(paletteKey(press('k', { metaKey: true }), SHOWN_IN_BOOK)).toEqual({ kind: 'hide' });
  });

  it('switches scope when the shortcut names the other one', () => {
    expect(paletteKey(press('k', { metaKey: true, shiftKey: true }), SHOWN_IN_BOOK)).toEqual({
      kind: 'choose',
      scope: 'all',
    });
  });

  it('ignores a plain k', () => {
    expect(paletteKey(press('k'), HIDDEN_IN_BOOK)).toEqual({ kind: 'ignore' });
    expect(paletteKey(press('k'), SHOWN_IN_BOOK)).toEqual({ kind: 'ignore' });
  });

  it('ignores every other key while hidden', () => {
    for (const key of ['Escape', 'ArrowDown', 'ArrowUp', 'Enter']) {
      expect(paletteKey(press(key), HIDDEN_IN_BOOK)).toEqual({ kind: 'ignore' });
    }
  });

  it('hides on Escape while shown', () => {
    expect(paletteKey(press('Escape'), SHOWN_ON_SHELF)).toEqual({ kind: 'hide' });
  });

  it('moves down and up with the arrow keys', () => {
    expect(paletteKey(press('ArrowDown'), SHOWN_ON_SHELF)).toEqual({ kind: 'move', by: 1 });
    expect(paletteKey(press('ArrowUp'), SHOWN_ON_SHELF)).toEqual({ kind: 'move', by: -1 });
  });

  it('opens in place on Enter and in a new tab with ⌘ or Ctrl held', () => {
    expect(paletteKey(press('Enter'), SHOWN_ON_SHELF)).toEqual({ kind: 'open', newTab: false });
    expect(paletteKey(press('Enter', { metaKey: true }), SHOWN_ON_SHELF)).toEqual({
      kind: 'open',
      newTab: true,
    });
    expect(paletteKey(press('Enter', { ctrlKey: true }), SHOWN_ON_SHELF)).toEqual({
      kind: 'open',
      newTab: true,
    });
  });

  it('ignores typing while shown', () => {
    expect(paletteKey(press('a'), SHOWN_ON_SHELF)).toEqual({ kind: 'ignore' });
  });
});
