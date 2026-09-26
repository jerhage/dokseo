import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TAG_COLOURS, nextColour } from './tag-colour';
import type { ColouredTag } from './tag-colour';

function coloured(colours: readonly ColouredTag['colour'][]): readonly ColouredTag[] {
  return colours.map((colour) => ({ colour }));
}

const STYLES = new URL('../../../../styles/', import.meta.url);
const THEMES = new URL('base/themes/', STYLES);

function valuesIn(url: URL): ReadonlyMap<string, string> {
  const css = readFileSync(url, 'utf8').replaceAll(/\/\*[\s\S]*?\*\//gu, '');
  return new Map(
    Array.from(css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/gu), (found) => [
      found[1] ?? '',
      (found[2] ?? '').trim().replaceAll(/\s+/gu, ' '),
    ]),
  );
}

const SCHEME = valuesIn(new URL('base/scheme.css', STYLES));

const THEME_VALUES = readdirSync(THEMES)
  .filter((file) => file.endsWith('.css'))
  .toSorted()
  .map((file) => ({
    theme: file.slice(0, -'.css'.length),
    values: new Map([...SCHEME, ...valuesIn(new URL(file, THEMES))]),
  }));

function resolved(values: ReadonlyMap<string, string>, name: string): string | null {
  const value = values.get(name);
  if (value === undefined) return null;
  const alias = /^var\((--[\w-]+)\)$/u.exec(value)?.[1];
  return alias === undefined ? value : resolved(values, alias);
}

function halves(value: string | null): readonly [string, string] | null {
  if (value === null) return null;
  const pair = /^light-dark\((.*)\)$/u.exec(value)?.[1];
  if (pair === undefined) return [value, value];
  let depth = 0;
  for (let index = 0; index < pair.length; index += 1) {
    if (pair[index] === '(') depth += 1;
    if (pair[index] === ')') depth -= 1;
    if (pair[index] === ',' && depth === 0) {
      return [pair.slice(0, index).trim(), pair.slice(index + 1).trim()];
    }
  }
  return null;
}

function tagHalves(colour: string): readonly [string, string] | null {
  return halves(resolved(SCHEME, `--ds-tag-${colour}`));
}

function sharedWithRole(role: string): readonly string[] {
  return THEME_VALUES.flatMap(({ theme, values }) => {
    const own = halves(resolved(values, role));
    if (own === null) return [`${theme} has no ${role}`];
    return TAG_COLOURS.filter((colour) => {
      const tag = tagHalves(colour);
      return tag !== null && (tag[0] === own[0] || tag[1] === own[1]);
    }).map((colour) => `${theme} ${colour}`);
  });
}

describe('TAG_COLOURS', () => {
  it('keeps the six it shipped with, first and in order', () => {
    expect(TAG_COLOURS.slice(0, 6)).toEqual(['slate', 'clay', 'sage', 'plum', 'rose', 'ice']);
  });

  it('names every colour once', () => {
    expect(new Set(TAG_COLOURS).size).toBe(TAG_COLOURS.length);
  });

  it('gives every name a light and a dark token, so no tag renders a colourless square', () => {
    for (const colour of TAG_COLOURS)
      expect({ colour, pair: tagHalves(colour) }).not.toEqual({ colour, pair: null });
  });

  it('shares no colour with the primary of any theme, which means a machine touched this', () => {
    expect(THEME_VALUES.length).toBeGreaterThan(0);
    expect(sharedWithRole('--ds-primary')).toEqual([]);
  });

  it('shares no colour with the accent of any theme, which marks a note', () => {
    expect(sharedWithRole('--ds-accent')).toEqual([]);
  });

  it('gives every name a colour of its own in each scheme', () => {
    const pairs = TAG_COLOURS.map((colour) => tagHalves(colour));

    expect(new Set(pairs.map((pair) => pair?.[0])).size).toBe(TAG_COLOURS.length);
    expect(new Set(pairs.map((pair) => pair?.[1])).size).toBe(TAG_COLOURS.length);
  });
});

describe('nextColour', () => {
  it('returns the first palette colour when nothing is tagged yet', () => {
    expect(nextColour([])).toBe('slate');
  });

  it('returns the first unused colour while the palette has one', () => {
    expect(nextColour(coloured(['slate', 'clay']))).toBe('sage');
  });

  it('returns the least used colour once every one is taken', () => {
    const twice = [...TAG_COLOURS, ...TAG_COLOURS].filter((colour) => colour !== 'rose');

    expect(nextColour(coloured(twice))).toBe('rose');
  });

  it('breaks a tie by the palette order', () => {
    const existing = coloured([...TAG_COLOURS, 'slate']);

    expect(nextColour(existing)).toBe('clay');
  });

  it('reaches every colour before it repeats one', () => {
    const taken: ColouredTag['colour'][] = [];
    for (let made = 0; made < TAG_COLOURS.length; made += 1) {
      taken.push(nextColour(coloured(taken)));
    }

    expect(new Set(taken).size).toBe(TAG_COLOURS.length);
  });

  it('answers the same for the same tags whatever order they arrive in', () => {
    const existing = coloured(['ice', 'clay', 'slate', 'clay']);

    expect(nextColour(existing)).toBe(nextColour(existing.toReversed()));
  });
});
