import { describe, expect, it } from 'vitest';
import { TAG_COLOURS, nextColour } from './tag-colour';
import type { ColouredTag } from './tag-colour';

function coloured(colours: readonly ColouredTag['colour'][]): readonly ColouredTag[] {
  return colours.map((colour) => ({ colour }));
}

describe('TAG_COLOURS', () => {
  it('holds exactly six names in the drawn order', () => {
    expect(TAG_COLOURS).toEqual(['slate', 'clay', 'sage', 'plum', 'rose', 'ice']);
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
    const existing = coloured([
      'slate',
      'slate',
      'clay',
      'clay',
      'sage',
      'sage',
      'plum',
      'plum',
      'rose',
      'ice',
      'ice',
    ]);

    expect(nextColour(existing)).toBe('rose');
  });

  it('breaks a tie by the palette order', () => {
    const existing = coloured(['slate', 'clay', 'sage', 'plum', 'rose', 'ice', 'slate']);

    expect(nextColour(existing)).toBe('clay');
  });

  it('answers the same for the same tags whatever order they arrive in', () => {
    const existing = coloured(['ice', 'clay', 'slate', 'clay']);

    expect(nextColour(existing)).toBe(nextColour(existing.toReversed()));
  });
});
