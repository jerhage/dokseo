import { describe, expect, it } from 'vitest';
import { NO_MATCH } from '../../domain/capture/match-stepping';
import { createSearchPalette } from './search-palette.svelte';
import type { SearchPaletteHook } from './search-palette.svelte';

describe('createSearchPalette', () => {
  it('reveals the dialog in the chosen scope with no cursor', () => {
    const palette = createSearchPalette();
    palette.reveal('all');

    expect([palette.shown, palette.present, palette.scope, palette.at]).toEqual([
      true,
      true,
      'all',
      NO_MATCH,
    ]);
  });

  it('stays present once hidden, and goes when the dialog has gone', () => {
    const palette = createSearchPalette();
    palette.reveal('all');

    palette.hide();
    expect([palette.shown, palette.present]).toEqual([false, true]);

    palette.gone();
    expect(palette.present).toBe(false);
  });

  it('moves the cursor, answers where it landed, and stops at the last row', () => {
    const palette = createSearchPalette();
    palette.reveal('book');

    expect(palette.moveBy(1, 2)).toBe(0);
    expect(palette.moveBy(1, 2)).toBe(1);
    expect(palette.moveBy(1, 2)).toBe(1);
    expect(palette.at).toBe(1);
  });

  it('moves from the shown cursor, not from a row a narrower query dropped', () => {
    const palette = createSearchPalette();
    palette.reveal('all');
    expect(palette.moveBy(-1, 4)).toBe(3);

    expect(palette.moveBy(1, 2)).toBe(0);
  });

  it.each([
    ['choosing a scope', (palette: SearchPaletteHook) => palette.choose('all')],
    ['revealing', (palette: SearchPaletteHook) => palette.reveal('book')],
    ['restarting', (palette: SearchPaletteHook) => palette.restart()],
    ['toggling the tag filter', (palette: SearchPaletteHook) => palette.toggleTags()],
  ])('drops the cursor on %s', (_name, act) => {
    const palette = createSearchPalette();
    palette.reveal('book');
    palette.moveBy(1, 2);

    act(palette);

    expect(palette.at).toBe(NO_MATCH);
  });

  it('toggles the tag filter', () => {
    const palette = createSearchPalette();

    palette.toggleTags();
    expect(palette.filter).toBe('tags');

    palette.toggleTags();
    expect(palette.filter).toBe('everything');
  });
});
