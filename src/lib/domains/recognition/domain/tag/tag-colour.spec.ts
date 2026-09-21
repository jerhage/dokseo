import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TAG_COLOURS, nextColour } from './tag-colour';
import type { ColouredTag } from './tag-colour';

function coloured(colours: readonly ColouredTag['colour'][]): readonly ColouredTag[] {
  return colours.map((colour) => ({ colour }));
}

const TOKENS = readFileSync(new URL('../../../../styles/tokens.css', import.meta.url), 'utf8');

function hexOf(name: string): string | null {
  return new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'u').exec(TOKENS)?.[1] ?? null;
}

describe('TAG_COLOURS', () => {
  it('keeps the six it shipped with, first and in order', () => {
    expect(TAG_COLOURS.slice(0, 6)).toEqual(['slate', 'clay', 'sage', 'plum', 'rose', 'ice']);
  });

  it('names every colour once', () => {
    expect(new Set(TAG_COLOURS).size).toBe(TAG_COLOURS.length);
  });

  it('gives every name a token, so no tag renders a colourless square', () => {
    for (const colour of TAG_COLOURS) expect(hexOf(`c-tag-${colour}`)).not.toBeNull();
  });

  it('shares no colour with the accent, which means a machine touched this', () => {
    const accent = hexOf('c-accent');

    expect(accent).not.toBeNull();
    for (const colour of TAG_COLOURS) expect(hexOf(`c-tag-${colour}`)).not.toBe(accent);
  });

  it('shares no colour with the note yellow, which already means something', () => {
    const note = hexOf('c-note');

    expect(note).not.toBeNull();
    for (const colour of TAG_COLOURS) expect(hexOf(`c-tag-${colour}`)).not.toBe(note);
  });

  it('gives every name a colour of its own', () => {
    const hexes = TAG_COLOURS.map((colour) => hexOf(`c-tag-${colour}`));

    expect(new Set(hexes).size).toBe(TAG_COLOURS.length);
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
