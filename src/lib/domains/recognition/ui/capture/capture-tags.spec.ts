import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import { namedTag } from '../../domain/tag/tag';
import { tagOutcome } from './capture-tags.svelte';

const CROWN_TAG = namedTag(tagId('tag-crown'), 'crown', 'slate', 1);

const SWORD_TAG = namedTag(tagId('tag-sword'), 'sword', 'slate', 2);

describe('tagOutcome', () => {
  it('reports a tag that was minted', () => {
    expect(tagOutcome(ok(SWORD_TAG))).toEqual({ kind: 'created', tag: SWORD_TAG });
  });

  it('answers the tag a taken name already belongs to', () => {
    expect(tagOutcome(err({ kind: 'name-taken', tag: CROWN_TAG }))).toEqual({
      kind: 'existing',
      tag: CROWN_TAG,
    });
  });

  it('reports a refused store as a failure', () => {
    expect(tagOutcome(err({ kind: 'storage-failed', cause: 'quota' }))).toEqual({
      kind: 'failed',
      failure: { kind: 'storage-failed', cause: 'quota' },
    });
    expect(tagOutcome(err({ kind: 'not-stored' }))).toEqual({
      kind: 'failed',
      failure: { kind: 'not-stored' },
    });
  });
});
