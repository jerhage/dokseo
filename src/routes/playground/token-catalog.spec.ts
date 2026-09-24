import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COLOR_GROUPS,
  FONT_FAMILIES,
  OPACITIES,
  RADII,
  SHADOWS,
  SPACING,
  TYPE_SCALE,
  Z_SCALE,
} from './token-catalog';

const TOKENS = new URL('../../lib/styles/tokens/', import.meta.url);

function defined(file: string, pattern: RegExp): readonly string[] {
  const css = readFileSync(new URL(file, TOKENS), 'utf8');
  return Array.from(css.matchAll(/(--[\w-]+)\s*:/gu), (found) => found[1] ?? '')
    .filter((name) => pattern.test(name))
    .toSorted();
}

function sorted(names: readonly string[]): readonly string[] {
  return names.toSorted();
}

describe('the playground token catalog', () => {
  it('shows a swatch for every colour and border colour token, once', () => {
    const shown = COLOR_GROUPS.flatMap((group) => group.tokens);

    expect(sorted(shown)).toEqual(defined('colors.css', /^--(color|border-color)(-|$)/u));
  });

  it('shows every font family and font size', () => {
    expect(sorted(FONT_FAMILIES)).toEqual(defined('typography.css', /^--font-/u));
    expect(sorted(TYPE_SCALE)).toEqual(defined('typography.css', /^--text-/u));
  });

  it('shows every spacing step and radius', () => {
    expect(sorted(SPACING)).toEqual(defined('spacing.css', /^--sp-/u));
    expect(sorted(RADII)).toEqual(defined('spacing.css', /^--radius-/u));
  });

  it('shows every shadow and every z-index step', () => {
    expect(sorted(SHADOWS)).toEqual(defined('elevation.css', /^--shadow-/u));
    expect(sorted(Z_SCALE)).toEqual(defined('elevation.css', /^--z-/u));
  });

  it('shows every opacity step', () => {
    expect(sorted(OPACITIES)).toEqual(defined('opacity.css', /^--opacity-/u));
  });
});
