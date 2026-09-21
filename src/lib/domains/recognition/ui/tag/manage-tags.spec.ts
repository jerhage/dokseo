import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { CaptureError } from '../../domain/capture/capture-repository';
import { namedTag, renamedTag, recolouredTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagColour } from '../../domain/tag/tag-colour';
import type { TagError } from '../../domain/tag/tag-repository';
import type { RenameTagError } from '../../use-cases/tag/rename-tag';
import { ManageTagsView } from './manage-tags.svelte';

const SFX: Tag = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

const KEIGO: Tag = namedTag(tagId('keigo'), 'keigo', 'clay', 2);

type Store = {
  written: Tag[];
  removed: TagId[];
  reloads: number;
  renameFails: boolean;
  taken: Tag | null;
  recolourFails: boolean;
  removeFails: boolean;
};

function world() {
  const store: Store = {
    written: [],
    removed: [],
    reloads: 0,
    renameFails: false,
    taken: null,
    recolourFails: false,
    removeFails: false,
  };

  const container = {
    recognition: {
      renameTag: (tag: Tag, name: string): Promise<Result<Tag, RenameTagError>> => {
        if (store.taken !== null)
          return Promise.resolve(err({ kind: 'name-taken', tag: store.taken }));
        if (store.renameFails) return Promise.resolve(err({ kind: 'storage-unavailable' }));

        const renamed = renamedTag(tag, name);
        store.written.push(renamed);

        return Promise.resolve(ok(renamed));
      },
      recolourTag: (tag: Tag, colour: TagColour): Promise<Result<Tag, TagError>> => {
        if (store.recolourFails) return Promise.resolve(err({ kind: 'storage-unavailable' }));

        const recoloured = recolouredTag(tag, colour);
        store.written.push(recoloured);

        return Promise.resolve(ok(recoloured));
      },
      deleteTag: (tag: TagId): Promise<Result<number, TagError | CaptureError>> => {
        if (store.removeFails) return Promise.resolve(err({ kind: 'storage-unavailable' }));

        store.removed.push(tag);

        return Promise.resolve(ok(1));
      },
    },
  } as unknown as Container;

  const reload = (): Promise<void> => {
    store.reloads += 1;

    return Promise.resolve();
  };

  return { manage: new ManageTagsView(container, reload), store };
}

describe('ManageTagsView', () => {
  it('opens one row for renaming with its current name in the draft', () => {
    const { manage } = world();
    manage.startRename(SFX);

    expect(manage.renaming).toBe(SFX.id);
    expect(manage.draft).toBe('sfx');
  });

  it('writes the new name and reads the tags again', async () => {
    const { manage, store } = world();
    manage.startRename(SFX);
    manage.draft = 'sound effects';
    await manage.rename(SFX);

    expect(store.written.map((tag) => tag.name)).toEqual(['sound effects']);
    expect(store.reloads).toBe(1);
    expect(manage.renaming).toBeNull();
    expect(manage.failure).toBeNull();
  });

  it('names the tag already holding the name and keeps the field open', async () => {
    const { manage, store } = world();
    store.taken = KEIGO;
    manage.startRename(SFX);
    manage.draft = 'keigo';
    await manage.rename(SFX);

    expect(manage.failure).toContain('keigo');
    expect(manage.renaming).toBe(SFX.id);
    expect(manage.draft).toBe('keigo');
    expect(store.written).toEqual([]);
    expect(store.reloads).toBe(0);
  });

  it('refuses a draft that is only whitespace, so a tag never loses its name', async () => {
    const { manage, store } = world();
    manage.startRename(SFX);
    manage.draft = '   ';
    await manage.rename(SFX);

    expect(manage.failure).toBe('A tag needs a name.');
    expect(store.written).toEqual([]);
    expect(manage.renaming).toBe(SFX.id);
  });

  it('reports a rename that storage refused and keeps the field open', async () => {
    const { manage, store } = world();
    store.renameFails = true;
    manage.startRename(SFX);
    manage.draft = 'sound effects';
    await manage.rename(SFX);

    expect(manage.failure).toBe('That tag could not be renamed.');
    expect(manage.renaming).toBe(SFX.id);
    expect(store.written).toEqual([]);
    expect(store.reloads).toBe(0);
  });

  it('writes the chosen colour and reads the tags again', async () => {
    const { manage, store } = world();
    await manage.recolour(SFX, 'plum');

    expect(store.written.map((tag) => tag.colour)).toEqual(['plum']);
    expect(store.reloads).toBe(1);
    expect(manage.failure).toBeNull();
  });

  it('reports a colour that storage refused and writes nothing', async () => {
    const { manage, store } = world();
    store.recolourFails = true;
    await manage.recolour(SFX, 'plum');

    expect(manage.failure).toBe('That tag could not be recoloured.');
    expect(store.written).toEqual([]);
    expect(store.reloads).toBe(0);
  });

  it('holds one row at a time awaiting a delete', () => {
    const { manage } = world();
    manage.askRemove(SFX);
    manage.askRemove(KEIGO);

    expect(manage.confirming).toBe(KEIGO.id);
  });

  it('closes the rename field when a row is asked about instead', () => {
    const { manage } = world();
    manage.startRename(SFX);
    manage.askRemove(SFX);

    expect(manage.renaming).toBeNull();
  });

  it('deletes the tag, closes the confirmation and reads the tags again', async () => {
    const { manage, store } = world();
    manage.askRemove(SFX);
    await manage.remove(SFX);

    expect(store.removed).toEqual([SFX.id]);
    expect(manage.confirming).toBeNull();
    expect(store.reloads).toBe(1);
    expect(manage.failure).toBeNull();
  });

  it('reports a delete that storage refused and leaves the confirmation open', async () => {
    const { manage, store } = world();
    store.removeFails = true;
    manage.askRemove(SFX);
    await manage.remove(SFX);

    expect(manage.failure).toBe('That tag could not be deleted.');
    expect(manage.confirming).toBe(SFX.id);
    expect(store.removed).toEqual([]);
    expect(store.reloads).toBe(0);
  });

  it('keeps a stale write from landing after a later one', async () => {
    const { manage, store } = world();
    manage.startRename(SFX);
    manage.draft = 'sound effects';
    const stale = manage.rename(SFX);
    await manage.recolour(SFX, 'plum');
    manage.startRename(KEIGO);
    await stale;

    expect(manage.renaming).toBe(KEIGO.id);
    expect(store.reloads).toBe(1);
  });

  it('abandons a rename without writing anything', () => {
    const { manage, store } = world();
    manage.startRename(SFX);
    manage.draft = 'sound effects';
    manage.abandonRename();

    expect(manage.renaming).toBeNull();
    expect(store.written).toEqual([]);
  });
});
