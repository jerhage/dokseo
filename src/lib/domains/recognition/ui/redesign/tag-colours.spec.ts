import { describe, expect, it } from 'vitest';
import { TAG_COLOURS as DESIGN_SYSTEM_COLOURS } from '$lib/components/classes';
import { TAG_COLOURS } from '../../domain/tag/tag-colour';

describe('the tag colours', () => {
  it('names every domain tag colour the design system colours, and no other', () => {
    expect(TAG_COLOURS.toSorted()).toEqual(DESIGN_SYSTEM_COLOURS.toSorted());
  });
});
