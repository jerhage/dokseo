import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { readFailed, readReady } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import { at } from '$lib/shared/testing/at';
import type { Capture } from '../../domain/capture/capture';
import type { SearchedBook } from '../../domain/capture/capture-results';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { heldTagged, TagView, tagViewStatus } from './tag-view.svelte';
import type { TaggedCaptures } from './tag-view.svelte';

const SFX: Tag = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

const KEIGO: Tag = namedTag(tagId('keigo'), 'keigo', 'clay', 2);

const SLANG: Tag = namedTag(tagId('slang'), 'slang', 'sage', 3);

const LIBRARY: readonly Tag[] = [SFX, KEIGO, SLANG];

type Store = {
  tags: readonly Tag[];
  captures: readonly Capture[];
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
    anchor: regionAnchor([{ index: imageIndex(index), rect: pageRect(x, 0, 100, 60) }]),
    text: name,
    note: null,
    confidence: null,
    origin: 'recognized',
    createdAt,
    editedAt: null,
    tagIds: tags,
  };
}

function passage(name: string, id: string, tags: readonly TagId[], cfi: string): Capture {
  return {
    ...capture(name, id, tags),
    anchor: textAnchor(cfi, { exact: name, prefix: '', suffix: '' }, null),
  };
}

const PASSAGE_ORDER = ['/6/4!/2:0', '/6/14!/2:0', '/6/22!/2:0'];

function byPassageOrder(earlier: string, later: string): number {
  return PASSAGE_ORDER.indexOf(earlier) - PASSAGE_ORDER.indexOf(later);
}

function world(captures: readonly Capture[] = [], tags: readonly Tag[] = LIBRARY) {
  const store: Store = { tags, captures };
  const source: {
    books: readonly SearchedBook[];
    wanted: string | null;
    tagged: ReadState<TaggedCaptures> | null;
  } = { books: [], wanted: null, tagged: null };

  return {
    view: new TagView(() => source, byPassageOrder),
    store,
    source,
    load: () => {
      source.tagged = readReady({ tags: store.tags, captures: store.captures });
    },
  };
}

function loaded(captures: readonly Capture[] = [], tags: readonly Tag[] = LIBRARY) {
  const made = world(captures, tags);
  made.source.books = [...new Set(captures.map((held) => String(held.bookId)))].map((id) =>
    book(id),
  );
  made.load();

  return made;
}

describe('TagView', () => {
  it('holds every tag and every capture once the load settles', () => {
    const { view } = loaded([capture('first', 'one', [SFX.id])]);

    expect(view.tags).toEqual(LIBRARY);
    expect(view.captures).toHaveLength(1);
    expect(view.status).toBe('ready');
  });

  it('reports a failed read with nothing held', () => {
    const { view, source } = world([capture('first', 'one', [SFX.id])]);
    source.tagged = readFailed('locked');

    expect(view.status).toBe('failed');
    expect(view.tags).toEqual([]);
    expect(view.captures).toEqual([]);
  });

  it('orders the column by count descending and then by name', () => {
    const { view } = loaded([
      capture('first', 'one', [SFX.id, SLANG.id]),
      capture('second', 'one', [SFX.id]),
      capture('third', 'one', [KEIGO.id]),
    ]);

    expect(view.column.map((option) => option.tag.name)).toEqual(['sfx', 'keigo', 'slang']);
  });

  it('keeps only the tags whose name matches the filter', () => {
    const { view } = loaded([capture('first', 'one', [SFX.id])]);
    view.filter = 'la';

    expect(view.column.map((option) => option.tag.name)).toEqual(['slang']);
  });

  it('offers every tag again when the filter is only spaces', () => {
    const { view } = loaded();
    view.filter = '   ';

    expect(view.column).toHaveLength(LIBRARY.length);
  });

  it('names a tag by its id for a chip or a co-occurrent row', () => {
    const { view } = loaded();

    expect(view.tagsById.get(KEIGO.id)).toEqual(KEIGO);
  });

  it('summarizes the chosen tag across the library', () => {
    const { view, source } = loaded([
      capture('first', 'one', [SFX.id], 0, 0, 10),
      capture('second', 'two', [SFX.id], 0, 0, 40),
      capture('third', 'two', [KEIGO.id], 0, 0, 90),
    ]);
    source.wanted = SFX.name;

    expect(view.summary).toEqual({ captures: 2, documents: 2, lastAdded: 40 });
  });

  it('reports no summary, no co-occurrent tag and no group while nothing is chosen', () => {
    const { view } = loaded([capture('first', 'one', [SFX.id, KEIGO.id])]);

    expect(view.summary).toBeNull();
    expect(view.also).toEqual([]);
    expect(view.groups).toEqual([]);
  });

  it('reports the tags sharing a capture with the chosen one', () => {
    const { view, source } = loaded([capture('first', 'one', [SFX.id, KEIGO.id])]);
    source.wanted = SFX.name;

    expect(view.also).toEqual([{ id: KEIGO.id, count: 1 }]);
  });

  it('groups the chosen tag under the books it was given, in book order', () => {
    const { view, source } = loaded([
      capture('left', 'one', [SFX.id], 0, 20),
      capture('right', 'one', [SFX.id], 0, 600),
      capture('elsewhere', 'two', [KEIGO.id]),
    ]);
    source.wanted = SFX.name;

    const grouped = view.groups;
    expect(grouped).toHaveLength(1);
    expect(at(grouped, 0).captures.map((one) => one.text)).toEqual(['right', 'left']);
  });

  it('groups the passages of a chosen tag in the passage order it is given', () => {
    const { view, source } = loaded([
      passage('closing', 'one', [SFX.id], '/6/22!/2:0'),
      passage('opening', 'one', [SFX.id], '/6/4!/2:0'),
      passage('middle', 'one', [SFX.id], '/6/14!/2:0'),
    ]);
    source.wanted = SFX.name;

    expect(at(view.groups, 0).captures.map((one) => one.text)).toEqual([
      'opening',
      'middle',
      'closing',
    ]);
  });
});

describe('TagView and a book the library no longer holds', () => {
  it('counts each tag across the books the library holds, and no capture of one it no longer holds', () => {
    const { view, source } = loaded([
      capture('kept', 'one', [SFX.id]),
      capture('second', 'two', [SFX.id, KEIGO.id]),
      capture('orphan', 'gone', [SFX.id]),
    ]);
    source.books = [book('one'), book('two')];
    source.wanted = SFX.name;

    expect(view.counts.get(SFX.id)).toBe(2);
    expect(view.counts.get(KEIGO.id)).toBe(1);
  });

  it('reports the same number of documents as it renders groups', () => {
    const { view, source } = loaded([
      capture('kept', 'one', [SFX.id]),
      capture('orphan', 'gone', [SFX.id]),
    ]);
    source.books = [book('one')];
    source.wanted = SFX.name;

    expect(view.summary?.documents).toBe(view.groups.length);
    expect(view.summary?.captures).toBe(1);
  });

  it('leaves a co-occurrent tag of an orphaned capture out of the tally', () => {
    const { view, source } = loaded([
      capture('kept', 'one', [SFX.id]),
      capture('orphan', 'gone', [SFX.id, KEIGO.id]),
    ]);
    source.books = [book('one')];
    source.wanted = SFX.name;

    expect(view.also).toEqual([]);
  });
});

describe('TagView chosen by name', () => {
  it.each([
    ['as it is spelled', SFX.name],
    ['spelled in another case', SFX.name.toUpperCase()],
    ['spelled full width', 'ｓｆｘ'],
  ])('resolves a wanted name to its tag, %s', (_name, wanted) => {
    const { view, source } = loaded([capture('first', 'one', [SFX.id])]);
    source.wanted = wanted;

    expect(view.chosen).toBe(SFX.id);
  });

  it('chooses nothing while the tags are still to arrive', () => {
    const { view, source } = world([], LIBRARY);
    source.wanted = SFX.name;

    expect(view.chosen).toBeNull();
  });

  it('chooses nothing for a name no tag answers to', () => {
    const { view, source } = loaded([capture('first', 'one', [SFX.id])]);
    source.wanted = 'a name nobody made';

    expect(view.chosen).toBeNull();
  });
});

describe('tagViewStatus', () => {
  it('names each stage of the read, and idle before there is one', () => {
    expect(tagViewStatus(null)).toBe('idle');
    expect(tagViewStatus({ kind: 'loading' })).toBe('loading');
    expect(tagViewStatus(readFailed('locked'))).toBe('failed');
    expect(tagViewStatus(readReady({ tags: [], captures: [] }))).toBe('ready');
  });
});

describe('heldTagged', () => {
  it('holds the tags and captures of a ready read only', () => {
    const held = { tags: LIBRARY, captures: [capture('first', 'one', [SFX.id])] };

    expect(heldTagged(readReady(held))).toBe(held);
    expect(heldTagged(readFailed('locked'))).toEqual({ tags: [], captures: [] });
    expect(heldTagged({ kind: 'loading' })).toEqual({ tags: [], captures: [] });
    expect(heldTagged(null)).toEqual({ tags: [], captures: [] });
  });
});
