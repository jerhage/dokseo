import { describe, expect, it, vi } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { ManageTagsView } from './manage-tags.svelte';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/idle-write-query'));

vi.mock('@tanstack/svelte-query', async (original) => ({
  ...(await original<object>()),
  useQueryClient: () => ({}),
}));

const SFX: Tag = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

const KEIGO: Tag = namedTag(tagId('keigo'), 'keigo', 'clay', 2);

function unused(): never {
  throw new Error('no write runs in this spec');
}

function managing(): ManageTagsView {
  return new ManageTagsView(
    { renameTag: unused, recolourTag: unused, deleteTag: unused },
    () => undefined,
  );
}

describe('ManageTagsView', () => {
  it('opens one row for renaming with its current name in the draft', () => {
    const manage = managing();
    manage.startRename(SFX);

    expect(manage.renaming).toBe(SFX.id);
    expect(manage.draft).toBe('sfx');
  });

  it('refuses a draft that is only whitespace, so a tag never loses its name', async () => {
    const manage = managing();
    manage.startRename(SFX);
    manage.draft = '   ';
    await manage.rename(SFX);

    expect(manage.invalid).toBe('A tag needs a name.');
    expect(manage.renaming).toBe(SFX.id);
  });

  it('closes the rename field when a row is asked about instead', () => {
    const manage = managing();
    manage.startRename(KEIGO);
    manage.askRemove(SFX);

    expect(manage.renaming).toBeNull();
    expect(manage.draft).toBe('');
    expect(manage.confirming).toBe(SFX.id);
  });

  it('closes the confirmation when dismissed', () => {
    const manage = managing();
    manage.askRemove(SFX);
    manage.dismissRemove();

    expect(manage.confirming).toBeNull();
  });

  it('abandons a rename and forgets the draft', () => {
    const manage = managing();
    manage.startRename(SFX);
    manage.draft = 'sound effects';
    manage.abandonRename();

    expect(manage.renaming).toBeNull();
    expect(manage.draft).toBe('');
  });
});
