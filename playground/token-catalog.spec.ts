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

const TOKENS = new URL('../styles/tokens/', import.meta.url);

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
  it.each([
    [
      'colour and border colour',
      COLOR_GROUPS.flatMap((group) => group.tokens),
      'colors.css',
      /^--(color|border-color)(-|$)/u,
    ],
    ['font family', FONT_FAMILIES, 'typography.css', /^--font-/u],
    ['font size', TYPE_SCALE, 'typography.css', /^--text-/u],
    ['spacing', SPACING, 'spacing.css', /^--sp-/u],
    ['radius', RADII, 'radius.css', /^--radius-/u],
    ['shadow', SHADOWS, 'elevation.css', /^--shadow-/u],
    ['z-index', Z_SCALE, 'elevation.css', /^--z-/u],
    ['opacity', OPACITIES, 'opacity.css', /^--opacity-/u],
  ])('shows every %s token, once', (_, shown, file, pattern) => {
    expect(sorted(shown)).toEqual(defined(file, pattern));
  });
});
