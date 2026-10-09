import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { createTagEditing } from './tag-editing.svelte';

const SFX: Tag = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

const KEIGO: Tag = namedTag(tagId('keigo'), 'keigo', 'clay', 2);

describe('createTagEditing', () => {
  it('opens one row for renaming with its current name in the draft', () => {
    const editing = createTagEditing();
    editing.startRename(SFX);

    expect(editing.renaming).toBe(SFX.id);
    expect(editing.draft).toBe('sfx');
  });

  it('closes the rename field when a row is asked about instead', () => {
    const editing = createTagEditing();
    editing.startRename(KEIGO);
    editing.askRemove(SFX);

    expect(editing.renaming).toBeNull();
    expect(editing.draft).toBe('');
    expect(editing.confirming).toBe(SFX.id);
  });

  it('closes the confirmation when dismissed', () => {
    const editing = createTagEditing();
    editing.askRemove(SFX);
    editing.dismissRemove();

    expect(editing.confirming).toBeNull();
  });

  it('abandons a rename and forgets the draft', () => {
    const editing = createTagEditing();
    editing.startRename(SFX);
    editing.setDraft('sound effects');
    editing.abandonRename();

    expect(editing.renaming).toBeNull();
    expect(editing.draft).toBe('');
  });
});
