import { describe, expect, it, vi } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Container } from '$lib/container';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { Notice } from '$lib/shared/notice';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { editedCapture, notedCapture } from '../../domain/capture/capture';
import type { Capture, NotableCapture } from '../../domain/capture/capture';
import type { CaptureError } from '../../domain/capture/capture-repository';
import { tagCounts, taggedCapture, untaggedCapture } from '../../domain/tag/capture-tags';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError } from '../../domain/tag/tag-repository';
import type { CreateTagError } from '../../use-cases/tag/create-tag';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { FocusTarget } from './card-editing.svelte';
import { CapturePanelView, writtenIn } from './capture-panel.svelte';
import type { PanelSource } from './capture-panel.svelte';
import { READ } from './capture-read';
import { CaptureView } from './capture-view.svelte';
import type { PanelCapture } from './panel-capture';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/unrun-write-query'));

type Store = {
  rows: Capture[];
  tags: readonly Tag[];
  edits: string[];
  notes: string[];
  everyRead: number;
  removeFails: boolean;
  copyFails: boolean;
  copied: string[];
};

type World = {
  readonly store: Store;
  readonly notices: Notice[];
  readonly view: CaptureView;
  readonly panel: CapturePanelView;
  readonly source: { current: Omit<PanelSource, 'view'> };
};

class FakeStore implements StringStore {
  #items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }

  removeItem(key: string): void {
    this.#items.delete(key);
  }
}

const ONE = bookId('book-one');

const CROWN = tagId('tag-crown');

function unused(): never {
  throw new Error('The capture panel does not use this');
}

function regions(index: number): readonly ImageRegion[] {
  return [{ index: imageIndex(index), rect: imageRect(0, 0, 40, 20) }];
}

function storedRow(
  id: string,
  text: string,
  createdAt: number,
  note: string | null = null,
): Capture {
  return {
    id: captureId(id),
    bookId: ONE,
    anchor: regionAnchor(regions(createdAt)),
    text,
    note,
    confidence: null,
    origin: 'recognized',
    createdAt,
    editedAt: null,
    tagIds: [],
  };
}

function byCfi(earlier: string, later: string): number {
  return earlier.localeCompare(later);
}

function containerOf(store: Store): Container {
  const quiet: Trace = { step: () => undefined, image: () => undefined, end: () => undefined };
  const failed = (): Result<never, CaptureError> =>
    err({ kind: 'storage-failed', cause: 'the disk is busy' });

  return {
    beginTrace: () => quiet,
    library: {
      openFile: unused,
      openForReading: unused,
      listBooks: unused,
      readBook: unused,
      readCover: unused,
      readSource: unused,
      removeBook: unused,
      editBook: unused,
      saveReadingPlace: unused,
      markFinished: unused,
      markUnread: unused,
      readLibrarySize: unused,
      readPageSizes: unused,
    },
    recognition: {
      readModelConsent: unused,
      grantModelConsent: unused,
      recognizeRegion: unused,
      listCaptures: (book: BookId): Promise<Result<readonly Capture[], CaptureError>> =>
        Promise.resolve(ok(store.rows.filter((row) => row.bookId === book))),
      listEveryCapture: (): Promise<Result<readonly Capture[], CaptureError>> => {
        store.everyRead += 1;
        return Promise.resolve(ok([...store.rows]));
      },
      saveCapture: unused,
      writeNote: unused,
      editCaptureText: (capture: Capture, text: string): Promise<Result<Capture, CaptureError>> => {
        store.edits.push(text);
        return Promise.resolve(ok(editedCapture(capture, text, 99)));
      },
      writeCaptureNote: <T extends NotableCapture>(
        capture: T,
        note: string,
      ): Promise<Result<T, CaptureError>> => {
        store.notes.push(note);
        return Promise.resolve(ok(notedCapture(capture, note)));
      },
      removeCapture: (capture: CaptureId): Promise<Result<void, CaptureError>> => {
        if (store.removeFails) return Promise.resolve(failed());
        store.rows = store.rows.filter((row) => row.id !== capture);
        return Promise.resolve(ok(undefined));
      },
      restoreCapture: unused,
      clearCaptures: unused,
      listTags: (): Promise<Result<readonly Tag[], TagError>> => Promise.resolve(ok(store.tags)),
      createTag: (id: TagId, name: string): Promise<Result<Tag, CreateTagError>> => {
        const made = namedTag(id, name, 'slate', 2);
        store.tags = [...store.tags, made];
        return Promise.resolve(ok(made));
      },
      addTagToCapture: (capture: Capture, tag: TagId): Promise<Result<Capture, CaptureError>> =>
        Promise.resolve(ok(taggedCapture(capture, tag))),
      removeTagFromCapture: (
        capture: Capture,
        tag: TagId,
      ): Promise<Result<Capture, CaptureError>> =>
        Promise.resolve(ok(untaggedCapture(capture, tag))),
      renameTag: unused,
      recolourTag: unused,
      deleteTag: unused,
      readModelStorage: unused,
      deleteModel: unused,
      readRecognizerSetup: unused,
      saveRecognizerSetup: unused,
      detectCompute: unused,
      prepareRecognizer: unused,
      pauseModelLoad: unused,
      cancelModelLoad: unused,
      closeRecognizer: unused,
    },
    flowing: {
      readReadingSettings: unused,
      saveReadingSettings: unused,
    },
    storage: {
      readStorageAccount: unused,
    },
  };
}

async function opened(rows: readonly Capture[] = [], tags: readonly Tag[] = []): Promise<World> {
  const store: Store = {
    rows: [...rows],
    tags,
    edits: [],
    notes: [],
    everyRead: 0,
    removeFails: false,
    copyFails: false,
    copied: [],
  };
  const notices: Notice[] = [];
  const sorts = new FakeStore();
  const view: CaptureView = new CaptureView(
    containerOf(store),
    (notice) => {
      notices.push(notice);
    },
    createTestQueryClient(),
    () => ({
      state: READ,
      captures: store.rows.filter((row) => row.bookId === view.list.book),
      tags: store.tags,
      reload: () => undefined,
    }),
  );
  const source = {
    current: {
      language: 'ja' as Language | null,
      direction: 'rtl' as const,
      passages: byCfi,
      seekable: false,
    },
  };
  let counted: ReadonlyMap<TagId, number> = new Map();
  const panel = new CapturePanelView(
    () => ({ view, ...source.current }),
    {
      counts: () => counted,
      ask: () => {
        store.everyRead += 1;
        counted = tagCounts(store.rows);
      },
    },
    (text) => {
      if (store.copyFails) return Promise.reject(new Error('the clipboard is locked'));
      store.copied.push(text);
      return Promise.resolve();
    },
    (notice) => {
      notices.push(notice);
    },
    () => sorts,
  );
  view.list.open(ONE);

  return { store, notices, view, panel, source };
}

const LOADING_HALF = {
  fraction: 0.5,
  source: 'network',
  loadedBytes: 50,
  totalBytes: 100,
} as const;

function placedRow(id: string, x: number, createdAt: number): Capture {
  return {
    ...storedRow(id, id, createdAt),
    anchor: regionAnchor([{ index: imageIndex(3), rect: imageRect(x, 0, 40, 20) }]),
  };
}

function passageRow(id: string, cfi: string, createdAt: number): Capture {
  return {
    id: captureId(id),
    bookId: ONE,
    anchor: textAnchor(cfi, { exact: id, prefix: '', suffix: '' }, null),
    text: id,
    note: null,
    origin: 'lifted',
    createdAt,
    editedAt: null,
    tagIds: [],
  };
}

function target(): FocusTarget & { readonly name: string } {
  return { name: 'opener', focus: () => undefined };
}

function pending(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: regionAnchor(regions(9)),
    tagIds: [],
    origin: 'recognized',
    note: null,
    status: 'pending',
  };
}

const CROWN_TAG = namedTag(CROWN, 'crown', 'slate', 1);

describe('writtenIn', () => {
  it('answers the note for the note field and the text for the text field', async () => {
    const world = await opened([storedRow('a', '先生', 1, 'teacher')]);
    const card = at(world.panel.cards.cards, 0);

    expect(writtenIn('note', card)).toBe('teacher');
    expect(writtenIn('text', card)).toBe('先生');
  });

  it('answers an empty string for a card without a note', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);

    expect(writtenIn('note', at(world.panel.cards.cards, 0))).toBe('');
  });

  it('answers an empty string for a card still being read', async () => {
    const world = await opened();
    world.view.list.unsaved.put(pending('new'));

    expect(writtenIn('text', at(world.panel.cards.cards, 0))).toBe('');
  });
});

describe('CapturePanelView', () => {
  it('builds the cards from the capture list, the book language and the seekability', async () => {
    const lifted = {
      ...storedRow('a', '先生', 1),
      anchor: textAnchor('/6/4', { exact: '先生', prefix: '', suffix: '' }, '第一章'),
    };
    const world = await opened([lifted]);
    expect(at(world.panel.cards.cards, 0).passage).toBeNull();
    expect(at(world.panel.cards.cards, 0).placeLanguage).toBe('ja');

    world.source.current = { ...world.source.current, seekable: true, language: 'ko' };

    expect(at(world.panel.cards.cards, 0).passage).not.toBeNull();
    expect(at(world.panel.cards.cards, 0).placeLanguage).toBe('ko');
  });

  it('opens a draft seeded with the written text of its field', async () => {
    const world = await opened([storedRow('a', '先生', 1, 'teacher')]);
    const card = at(world.panel.cards.cards, 0);

    world.panel.openDraft('note', card, null);
    world.panel.openDraft('text', card, null);

    expect(world.view.drafts.draft('note', card.id)).toBe('teacher');
    expect(world.view.drafts.draft('text', card.id)).toBe('先生');
  });

  it('saves a text draft through the text edit and answers the opener', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);
    const card = at(world.panel.cards.cards, 0);
    const from = target();
    world.panel.openDraft('text', card, from);
    world.view.drafts.write('text', card.id, '先週');
    const edit = vi.spyOn(world.view.edits, 'edit').mockResolvedValue('saved');
    const annotate = vi.spyOn(world.view.edits, 'annotate').mockResolvedValue('saved');

    const saved = await world.panel.save('text', card.id);

    expect(saved).toEqual({ kind: 'closed', from });
    expect(edit.mock.calls).toEqual([[card.id, '先週']]);
    expect(annotate).not.toHaveBeenCalled();
  });

  it('saves a note draft through the note write', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);
    const card = at(world.panel.cards.cards, 0);
    world.panel.openDraft('note', card, null);
    world.view.drafts.write('note', card.id, 'teacher');
    const edit = vi.spyOn(world.view.edits, 'edit').mockResolvedValue('saved');
    const annotate = vi.spyOn(world.view.edits, 'annotate').mockResolvedValue('saved');

    await world.panel.save('note', card.id);

    expect(annotate.mock.calls).toEqual([[card.id, 'teacher']]);
    expect(edit).not.toHaveBeenCalled();
  });

  it('answers the opener of an abandoned draft and closes it', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);
    const card = at(world.panel.cards.cards, 0);
    const from = target();
    world.panel.openDraft('text', card, from);

    expect(world.panel.abandon('text', card.id)).toBe(from);
    expect(world.view.drafts.holds('text', card.id)).toBe(false);
  });

  it('closes the tag picker on the removed capture and forgets its drafts', async () => {
    const world = await opened([storedRow('a', '先生', 1), storedRow('b', '後', 2)]);
    const card = at(world.panel.cards.cards, 0);
    world.panel.openDraft('note', card, null);
    world.panel.openTags(card.id, target());
    vi.spyOn(world.view.removal, 'remove').mockResolvedValue('saved');

    await world.panel.remove(card.id);

    expect(world.panel.selection.picker.capture).toBeNull();
    expect(world.view.drafts.holds('note', card.id)).toBe(false);
  });

  it('keeps the tag picker open on another capture through a removal', async () => {
    const world = await opened([storedRow('a', '先生', 1), storedRow('b', '後', 2)]);
    world.panel.openTags(captureId('b'), target());

    await world.panel.remove(captureId('a'));

    expect(world.panel.selection.picker.capture).toBe(captureId('b'));
  });

  it('keeps the drafts of a capture whose removal is refused', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);
    const card = at(world.panel.cards.cards, 0);
    world.panel.openDraft('note', card, null);
    vi.spyOn(world.view.removal, 'remove').mockResolvedValue('failed');

    await world.panel.remove(card.id);

    expect(world.view.drafts.holds('note', card.id)).toBe(true);
  });

  it('answers the tag opener once when the picker closes', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);
    const from = target();
    world.panel.openTags(captureId('a'), from);

    expect(world.panel.closeTags()).toBe(from);
    expect(world.panel.selection.picker.capture).toBeNull();
    expect(world.panel.closeTags()).toBeNull();
  });

  it('answers no opener after a removal closed the picker', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);
    world.panel.openTags(captureId('a'), target());
    await world.panel.remove(captureId('a'));

    expect(world.panel.closeTags()).toBeNull();
  });

  it('answers no opener when no picker is open', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);

    expect(world.panel.closeTags()).toBeNull();
  });

  it('reads the library counts once however often the picker opens', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);

    world.panel.openTags(captureId('a'), target());
    world.panel.closeTags();
    world.panel.openTags(captureId('a'), target());

    expect(world.store.everyRead).toBe(1);
  });

  it('answers the card the tag picker is open on', async () => {
    const world = await opened([storedRow('a', '先生', 1), storedRow('b', '後', 2)]);

    expect(world.panel.tagging).toBeNull();
    world.panel.openTags(captureId('b'), target());

    expect(world.panel.tagging?.id).toBe(captureId('b'));
  });

  it('steps from the cursor of the current search', async () => {
    const world = await opened([storedRow('a', '先生', 1), storedRow('b', '先', 2)]);
    world.panel.cards.query = '先';

    expect(world.panel.stepBy(1).kind).toBe('fresh');
    expect(world.panel.cards.cursor).toBe(0);
    expect(world.panel.stepBy(1).kind).toBe('replacing');
    expect(world.panel.cards.cursor).toBe(1);
    expect(world.panel.stepBy(1).kind).toBe('nowhere');
  });

  it('counts the search steps against every capture in the book', async () => {
    const world = await opened([storedRow('a', '先生', 1), storedRow('b', '後', 2)]);
    world.panel.cards.query = '先';

    expect(world.panel.steps).toEqual({ tally: '1 of 2 matched', previous: false, next: true });
  });

  it('notes the model load on a capture still being read', async () => {
    const world = await opened();
    world.view.list.unsaved.put(pending('new'));
    expect(at(world.panel.cards.cards, 0).note).toBeNull();

    world.view.warmup.progress = LOADING_HALF;

    expect(at(world.panel.cards.cards, 0).note).not.toBeNull();
    expect(world.panel.announcement).toContain('50 percent');
  });

  it('orders the captures of one page by the reading direction', async () => {
    const world = await opened([placedRow('left', 0, 1), placedRow('right', 200, 2)]);
    expect(world.panel.cards.cards.map((card) => card.id)).toEqual([
      captureId('right'),
      captureId('left'),
    ]);

    world.source.current = { ...world.source.current, direction: 'ltr' };

    expect(world.panel.cards.cards.map((card) => card.id)).toEqual([
      captureId('left'),
      captureId('right'),
    ]);
  });

  it('orders the passages by the passage order it is given', async () => {
    const world = await opened([passageRow('first', '/6/2', 1), passageRow('second', '/6/4', 2)]);
    expect(world.panel.cards.cards.map((card) => card.id)).toEqual([
      captureId('first'),
      captureId('second'),
    ]);

    world.source.current = { ...world.source.current, passages: (a, b) => byCfi(b, a) };

    expect(world.panel.cards.cards.map((card) => card.id)).toEqual([
      captureId('second'),
      captureId('first'),
    ]);
  });

  it('lists the newest capture first when sorted by newest', async () => {
    const world = await opened([storedRow('a', '先生', 1), storedRow('b', '後', 2)]);

    world.panel.cards.sortBy('newest');

    expect(world.panel.cards.cards.map((card) => card.id)).toEqual([
      captureId('b'),
      captureId('a'),
    ]);
  });

  it('chips the tags a capture carries by their catalogue names', async () => {
    const world = await opened([taggedCapture(storedRow('a', '先生', 1), CROWN)], [CROWN_TAG]);

    expect(at(world.panel.cards.cards, 0).tags.map((chip) => chip.name)).toEqual(['crown']);
  });

  it('opens the picker with the tags the capture carries', async () => {
    const world = await opened([taggedCapture(storedRow('a', '先生', 1), CROWN)], [CROWN_TAG]);

    world.panel.openTags(captureId('a'), target());

    expect(world.panel.selection.picker.carried).toEqual([CROWN]);
  });

  it('offers the catalogue tags with their library counts', async () => {
    const world = await opened([storedRow('a', '先生', 1)], [CROWN_TAG]);
    world.store.rows = [
      ...world.store.rows,
      taggedCapture({ ...storedRow('x', '別', 7), bookId: bookId('book-two') }, CROWN),
    ];

    world.panel.openTags(captureId('a'), target());
    await Promise.resolve();
    await Promise.resolve();

    expect(world.panel.selection.picker.rows).toEqual([{ kind: 'tag', tag: CROWN_TAG, count: 1 }]);
  });

  it('counts the search steps from the cursor once a match is stepped to', async () => {
    const world = await opened([storedRow('a', '先生', 1), storedRow('b', '先', 2)]);
    world.panel.cards.query = '先';

    world.panel.stepBy(1);

    expect(world.panel.steps).toEqual({ tally: 'match 1 of 2', previous: false, next: true });
  });

  it('reveals the latest capture only while the panel shows', async () => {
    const world = await opened();
    world.view.list.unsaved.put(pending('new'));

    expect(world.panel.reveals(captureId('new'), false)).toBe(false);
    expect(world.panel.reveals(captureId('new'), true)).toBe(true);
  });

  it('announces the model load only while a capture waits', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);
    expect(world.panel.announcement).toBe('');

    world.view.list.unsaved.put(pending('new'));

    expect(world.panel.announcement).toBe('Reading the selection.');
  });

  it('warns about a running model that does not read the book language', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);
    expect(world.panel.mismatch).toBeNull();

    world.view.warmup.session = {
      modelId: JAPANESE_OCR_MODEL.modelId,
      device: 'wasm',
      fellBackFrom: null,
    };
    expect(world.panel.mismatch).toBeNull();

    world.source.current = { ...world.source.current, language: 'ko' };
    expect(world.panel.mismatch).toContain('Korean');
  });

  it('warns about clearing only while the clear is being confirmed', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);
    expect(world.panel.warning).toBeNull();

    world.view.clearAll.ask();

    expect(world.panel.warning).not.toBeNull();
  });

  it('copies through the clipboard write it was given', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);

    await world.panel.copying.copy(captureId('a'), '先生');

    expect(world.store.copied).toEqual(['先生']);
    expect(world.panel.copying.copied).toBe(captureId('a'));
  });

  it('tells a refused copy through the notify it was given', async () => {
    const world = await opened([storedRow('a', '先生', 1)]);
    world.store.copyFails = true;

    await world.panel.copying.copy(captureId('a'), '先生');

    expect(world.notices.map((notice) => notice.title)).toEqual(['The text could not be copied']);
  });
});
