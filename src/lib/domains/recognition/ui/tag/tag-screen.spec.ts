import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import type { BookMatches, SearchedBook } from '../../domain/capture/capture-results';
import { NO_MATCH } from '../../domain/capture/match-stepping';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import {
  addedText,
  neighboursOf,
  shelvedRows,
  summaryText,
  tagStage,
  taggedCount,
  taggedShelves,
  walkKey,
} from './tag-screen';
import type { WalkPress } from './tag-screen';

const SFX: Tag = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

const KEIGO: Tag = namedTag(tagId('keigo'), 'keigo', 'clay', 2);

const SLANG: Tag = namedTag(tagId('slang'), 'slang', 'sage', 3);

const TAGS: readonly Tag[] = [SFX, KEIGO, SLANG];

const NOW = 10 * 60_000;

function book(id: string): SearchedBook {
  return { id: bookId(id), title: `Book ${id}`, language: 'ja', direction: 'rtl' };
}

function regional(name: string, id: string, tags: readonly TagId[], index = 0): Capture {
  return {
    id: captureId(name),
    bookId: bookId(id),
    anchor: regionAnchor([{ index: imageIndex(index), rect: imageRect(0, 0, 100, 60) }]),
    text: name,
    note: null,
    confidence: null,
    origin: 'recognized',
    createdAt: NOW - 3 * 60_000,
    editedAt: null,
    tagIds: tags,
  };
}

function textual(name: string, id: string, tags: readonly TagId[]): Capture {
  return {
    ...regional(name, id, tags),
    anchor: textAnchor('epubcfi(/6/2)', { exact: name, prefix: '', suffix: '' }),
  };
}

function press(key: string, held: Partial<WalkPress> = {}): WalkPress {
  return { key, metaKey: false, ctrlKey: false, altKey: false, defaultPrevented: false, ...held };
}

describe('tagStage', () => {
  const summary = { captures: 2, documents: 1, lastAdded: 5 };

  it('shows a chosen tag with its summary when captures carry it', () => {
    expect(tagStage({ tag: SFX, summary, tags: 3, status: 'ready' })).toEqual({
      kind: 'chosen',
      tag: SFX,
      summary,
    });
  });

  it('reports a chosen tag nothing carries as empty', () => {
    const none = { captures: 0, documents: 0, lastAdded: null };

    expect(tagStage({ tag: SFX, summary: none, tags: 3, status: 'ready' }).kind).toBe('empty');
  });

  it('asks for a choice when tags exist and none is chosen', () => {
    expect(tagStage({ tag: undefined, summary: null, tags: 3, status: 'ready' }).kind).toBe(
      'unchosen',
    );
  });

  it('reports loading while no tag has arrived yet', () => {
    expect(tagStage({ tag: undefined, summary: null, tags: 0, status: 'idle' }).kind).toBe(
      'loading',
    );
    expect(tagStage({ tag: undefined, summary: null, tags: 0, status: 'loading' }).kind).toBe(
      'loading',
    );
  });

  it('reports no tags once the load settles empty or fails', () => {
    expect(tagStage({ tag: undefined, summary: null, tags: 0, status: 'ready' }).kind).toBe(
      'no-tags',
    );
    expect(tagStage({ tag: undefined, summary: null, tags: 0, status: 'failed' }).kind).toBe(
      'no-tags',
    );
  });
});

describe('taggedShelves', () => {
  const groups: readonly BookMatches<Capture>[] = [
    {
      book: book('one'),
      captures: [regional('first', 'one', [SFX.id, KEIGO.id], 4), textual('flowing', 'one', [])],
    },
    { book: book('two'), captures: [textual('only text', 'two', [SFX.id])] },
    { book: book('three'), captures: [regional('second', 'three', [SFX.id], 0)] },
  ];

  const shelves = taggedShelves({
    groups,
    covers: new Map([[bookId('one'), 'blob:cover']]),
    chosen: SFX.id,
    tags: TAGS,
    now: NOW,
  });

  it('drops a capture with no page and a book left with no rows', () => {
    expect(shelves.map((shelf) => String(shelf.id))).toEqual(['one', 'three']);
    expect(shelves[0]?.rows.map((row) => row.text)).toEqual(['first']);
  });

  it('numbers the rows across every book in order', () => {
    expect(shelvedRows(shelves).map((row) => row.order)).toEqual([0, 1]);
  });

  it('links each row to its page in the reader with the capture', () => {
    expect(shelves[0]?.rows[0]?.href).toBe('/read/one?image=4&capture=first');
    expect(shelves[0]?.rows[0]?.page).toBe('005');
    expect(shelves[0]?.rows[0]?.place).toBe('p.005');
    expect(shelves[0]?.rows[0]?.when).toBe('captured 3 min ago');
  });

  it('carries every tag on a row except the chosen one', () => {
    expect(shelves[0]?.rows[0]?.chips).toEqual([{ id: KEIGO.id, name: 'keigo', colour: 'clay' }]);
  });

  it('gives a book its cover, or none', () => {
    expect(shelves.map((shelf) => shelf.cover)).toEqual(['blob:cover', null]);
  });
});

describe('neighboursOf', () => {
  it('names the other tags with their counts and skips one no longer known', () => {
    const byId = new Map(TAGS.map((tag) => [tag.id, tag]));

    expect(
      neighboursOf(
        [
          { id: KEIGO.id, count: 3 },
          { id: tagId('gone'), count: 1 },
        ],
        byId,
      ),
    ).toEqual([{ id: KEIGO.id, name: 'keigo', colour: 'clay', count: 3 }]);
  });
});

describe('the summary text', () => {
  it('counts captures and documents in the singular and the plural', () => {
    expect(summaryText({ captures: 1, documents: 1, lastAdded: null })).toBe(
      '1 capture across 1 document',
    );
    expect(summaryText({ captures: 4, documents: 2, lastAdded: null })).toBe(
      '4 captures across 2 documents',
    );
  });

  it('says when the tag was last added, or nothing', () => {
    expect(addedText({ captures: 1, documents: 1, lastAdded: NOW - 60_000 }, NOW)).toBe(
      'captured 1 min ago',
    );
    expect(addedText({ captures: 1, documents: 1, lastAdded: null }, NOW)).toBeNull();
  });

  it('counts the tagged captures on a shelf', () => {
    expect(taggedCount(1)).toBe('1 capture tagged');
    expect(taggedCount(3)).toBe('3 captures tagged');
  });
});

describe('walkKey', () => {
  it('moves down and up with the bare arrow keys', () => {
    expect(walkKey(press('ArrowDown'), 3, NO_MATCH)).toEqual({ kind: 'move', by: 1 });
    expect(walkKey(press('ArrowUp'), 3, 1)).toEqual({ kind: 'move', by: -1 });
  });

  it('ignores an arrow held with a modifier', () => {
    expect(walkKey(press('ArrowDown', { metaKey: true }), 3, 0).kind).toBe('none');
    expect(walkKey(press('ArrowDown', { ctrlKey: true }), 3, 0).kind).toBe('none');
    expect(walkKey(press('ArrowUp', { altKey: true }), 3, 0).kind).toBe('none');
  });

  it('opens the walked row with Enter, and in a new tab with Cmd or Ctrl', () => {
    expect(walkKey(press('Enter'), 3, 0).kind).toBe('open');
    expect(walkKey(press('Enter', { metaKey: true }), 3, 0).kind).toBe('open-in-new-tab');
    expect(walkKey(press('Enter', { ctrlKey: true }), 3, 0).kind).toBe('open-in-new-tab');
  });

  it('does nothing on Enter before a row is walked to', () => {
    expect(walkKey(press('Enter'), 3, NO_MATCH).kind).toBe('none');
  });

  it('does nothing with no rows, a handled key, or another key', () => {
    expect(walkKey(press('ArrowDown'), 0, NO_MATCH).kind).toBe('none');
    expect(walkKey(press('ArrowDown', { defaultPrevented: true }), 3, 0).kind).toBe('none');
    expect(walkKey(press('a'), 3, 0).kind).toBe('none');
  });
});
