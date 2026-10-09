import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { namedTag } from '../../domain/tag/tag';
import { tagOutcome } from './capture-tag-rules';

const CROWN_TAG = namedTag(tagId('tag-crown'), 'crown', 'slate', 1);

const SWORD_TAG = namedTag(tagId('tag-sword'), 'sword', 'slate', 2);

describe('tagOutcome', () => {
  it('reports a tag that was minted', () => {
    expect(tagOutcome({ kind: 'success', tag: SWORD_TAG })).toEqual({
      kind: 'created',
      tag: SWORD_TAG,
    });
  });

  it('answers the tag a taken name already belongs to', () => {
    expect(tagOutcome({ kind: 'name-taken', tag: CROWN_TAG })).toEqual({
      kind: 'existing',
      tag: CROWN_TAG,
    });
  });

  it('reports a blocked store as a failure', () => {
    expect(tagOutcome(STORAGE_UNAVAILABLE)).toEqual({
      kind: 'failed',
      failure: STORAGE_UNAVAILABLE,
    });
  });
});
