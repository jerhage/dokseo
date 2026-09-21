import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError } from '../../domain/capture/capture-repository';
import type { SearchedBook } from '../../domain/capture/capture-results';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError } from '../../domain/tag/tag-repository';
import { TagView } from './tag-view.svelte';

const SFX: Tag = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

const KEIGO: Tag = namedTag(tagId('keigo'), 'keigo', 'clay', 2);

const SLANG: Tag = namedTag(tagId('slang'), 'slang', 'sage', 3);

const LIBRARY: readonly Tag[] = [SFX, KEIGO, SLANG];

type Store = {
  tags: readonly Tag[];
  captures: readonly Capture[];
  tagsFail: boolean;
  capturesFail: boolean;
};

function book(id: string, direction: ReadingDirection = 'rtl'): SearchedBook {
  return { id: bookId(id), title: `Book ${id}`, language: 'ja', direction };
}

function capture(
  name: string,
  id: string,
  tags: readonly TagId[],
  index = 0,
  x = 0,
  createdAt = 1,
): Capture {
  return {
    id: captureId(name),
    bookId: bookId(id),
    regions: [{ index: imageIndex(index), rect: imageRect(x, 0, 100, 60) }],
    text: name,
    confidence: null,
    origin: 'recognized',
    createdAt,
    editedAt: null,
    tagIds: tags,
  };
}

function world(captures: readonly Capture[] = [], tags: readonly Tag[] = LIBRARY) {
  const store: Store = { tags, captures, tagsFail: false, capturesFail: false };

  const container = {
    recognition: {
      listTags: (): Promise<Result<readonly Tag[], TagError>> =>
        Promise.resolve(store.tagsFail ? err({ kind: 'storage-unavailable' }) : ok(store.tags)),
      listEveryCapture: (): Promise<Result<readonly Capture[], CaptureError>> =>
        Promise.resolve(
          store.capturesFail ? err({ kind: 'storage-unavailable' }) : ok(store.captures),
        ),
    },
  } as unknown as Container;

  return { view: new TagView(container), store };
}

async function loaded(captures: readonly Capture[] = [], tags: readonly Tag[] = LIBRARY) {
  const made = world(captures, tags);
  made.view.books = [...new Set(captures.map((held) => String(held.bookId)))].map((id) => book(id));
  await made.view.load();

  return made;
}

describe('TagView', () => {
  it('holds every tag and every capture once the load settles', async () => {
    const { view } = await loaded([capture('first', 'one', [SFX.id])]);

    expect(view.tags).toEqual(LIBRARY);
    expect(view.captures).toHaveLength(1);
    expect(view.status).toBe('ready');
  });

  it('counts each tag across the whole library', async () => {
    const { view } = await loaded([
      capture('first', 'one', [SFX.id]),
      capture('second', 'two', [SFX.id, KEIGO.id]),
    ]);

    expect(view.counts.get(SFX.id)).toBe(2);
    expect(view.counts.get(KEIGO.id)).toBe(1);
  });

  it('orders the column by count descending and then by name', async () => {
    const { view } = await loaded([
      capture('first', 'one', [SFX.id, SLANG.id]),
      capture('second', 'one', [SFX.id]),
      capture('third', 'one', [KEIGO.id]),
    ]);

    expect(view.column.map((option) => option.tag.name)).toEqual(['sfx', 'keigo', 'slang']);
  });

  it('keeps only the tags whose name matches the filter', async () => {
    const { view } = await loaded([capture('first', 'one', [SFX.id])]);
    view.filter = 'la';

    expect(view.column.map((option) => option.tag.name)).toEqual(['slang']);
  });

  it('offers every tag again when the filter is only spaces', async () => {
    const { view } = await loaded();
    view.filter = '   ';

    expect(view.column).toHaveLength(LIBRARY.length);
  });

  it('names a tag by its id for a chip or a co-occurrent row', async () => {
    const { view } = await loaded();

    expect(view.tagsById.get(KEIGO.id)).toEqual(KEIGO);
  });

  it('summarizes the chosen tag across the library', async () => {
    const { view } = await loaded([
      capture('first', 'one', [SFX.id], 0, 0, 10),
      capture('second', 'two', [SFX.id], 0, 0, 40),
      capture('third', 'two', [KEIGO.id], 0, 0, 90),
    ]);
    view.choose(SFX.id);

    expect(view.summary).toEqual({ captures: 2, documents: 2, lastAdded: 40 });
  });

  it('reports no summary and no co-occurrent tag while nothing is chosen', async () => {
    const { view } = await loaded([capture('first', 'one', [SFX.id, KEIGO.id])]);

    expect(view.summary).toBeNull();
    expect(view.also).toEqual([]);
  });

  it('reports the tags sharing a capture with the chosen one', async () => {
    const { view } = await loaded([capture('first', 'one', [SFX.id, KEIGO.id])]);
    view.choose(SFX.id);

    expect(view.also).toEqual([{ id: KEIGO.id, count: 1 }]);
  });

  it('groups the chosen tag under the books it was given, in book order', async () => {
    const { view } = await loaded([
      capture('left', 'one', [SFX.id], 0, 20),
      capture('right', 'one', [SFX.id], 0, 600),
      capture('elsewhere', 'two', [KEIGO.id]),
    ]);
    view.choose(SFX.id);

    const grouped = view.groups;
    expect(grouped).toHaveLength(1);
    expect(at(grouped, 0).captures.map((one) => one.text)).toEqual(['right', 'left']);
  });

  it('groups nothing while no tag is chosen', async () => {
    const { view } = await loaded([capture('first', 'one', [SFX.id])]);

    expect(view.groups).toEqual([]);
  });

  it('groups nothing again once the chosen tag is cleared', async () => {
    const { view } = await loaded([capture('first', 'one', [SFX.id])]);
    view.choose(SFX.id);
    view.choose(null);

    expect(view.groups).toEqual([]);
    expect(view.summary).toBeNull();
  });

  it('keeps the tags and captures it already holds when a later load fails', async () => {
    const { view, store } = await loaded([capture('first', 'one', [SFX.id])]);
    store.capturesFail = true;
    await view.load();

    expect(view.tags).toEqual(LIBRARY);
    expect(view.captures).toHaveLength(1);
    expect(view.status).toBe('failed');
  });

  it('keeps the held state when the tag list is the read that fails', async () => {
    const { view, store } = await loaded([capture('first', 'one', [SFX.id])]);
    store.tagsFail = true;
    await view.load();

    expect(view.tags).toEqual(LIBRARY);
    expect(view.captures).toHaveLength(1);
  });

  it('ignores a load that a newer one has overtaken', async () => {
    const { view, store } = await loaded([capture('first', 'one', [SFX.id])]);
    store.captures = [];
    const stale = view.load();
    store.captures = [capture('first', 'one', [SFX.id]), capture('second', 'two', [KEIGO.id])];
    await Promise.all([stale, view.load()]);

    expect(view.captures).toHaveLength(2);
  });
});

describe('TagView and a book the library no longer holds', () => {
  it('counts no capture of a book the library no longer holds', async () => {
    const { view } = await loaded([
      capture('kept', 'one', [SFX.id]),
      capture('orphan', 'gone', [SFX.id]),
    ]);
    view.books = [book('one')];
    view.choose(SFX.id);

    expect(view.counts.get(SFX.id)).toBe(1);
  });

  it('reports the same number of documents as it renders groups', async () => {
    const { view } = await loaded([
      capture('kept', 'one', [SFX.id]),
      capture('orphan', 'gone', [SFX.id]),
    ]);
    view.books = [book('one')];
    view.choose(SFX.id);

    expect(view.summary?.documents).toBe(view.groups.length);
    expect(view.summary?.captures).toBe(1);
  });

  it('leaves a co-occurrent tag of an orphaned capture out of the tally', async () => {
    const { view } = await loaded([
      capture('kept', 'one', [SFX.id]),
      capture('orphan', 'gone', [SFX.id, KEIGO.id]),
    ]);
    view.books = [book('one')];
    view.choose(SFX.id);

    expect(view.also).toEqual([]);
  });
});
