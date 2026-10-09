import { describe, expect, it, vi } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { ManageTags } from './manage-tags.svelte';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/idle-write-query'));

vi.mock('@tanstack/svelte-query', async (original) => ({
  ...(await original<object>()),
  useQueryClient: () => ({}),
}));

const SFX: Tag = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

function unused(): never {
  throw new Error('no write runs in this spec');
}

describe('ManageTags', () => {
  it('refuses a name that is only whitespace, so a tag never loses its name', async () => {
    const manage = new ManageTags(
      { renameTag: unused, recolourTag: unused, deleteTag: unused },
      () => undefined,
    );

    expect(await manage.rename(SFX, '   ')).toEqual({ kind: 'nameless' });
  });
});
