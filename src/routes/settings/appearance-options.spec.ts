import { describe, expect, it } from 'vitest';
import { COLOR_SCHEMES, THEMES } from '$lib/shared/appearance';
import { SCHEME_OPTIONS, THEME_OPTIONS } from './appearance-options';

describe('THEME_OPTIONS', () => {
  it('offers every theme the page accepts, once each and in order', () => {
    expect(THEME_OPTIONS.map((option) => option.theme)).toEqual(THEMES);
  });
});

describe('SCHEME_OPTIONS', () => {
  it('offers every color scheme, once each and in order', () => {
    expect(SCHEME_OPTIONS.map((option) => option.colorScheme)).toEqual(COLOR_SCHEMES);
  });
});
