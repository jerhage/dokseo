import { describe, expect, it } from 'vitest';
import type { Book } from '$lib/domains/library/domain/book/book';
import type { LibraryRepository } from '$lib/domains/library/domain/book/library-repository';
import type { RemovedBook } from '$lib/domains/library/domain/book/removed-book';
import type { Capture, RecognizedCapture } from '$lib/domains/recognition/domain/capture/capture';
import type { CaptureRepository } from '$lib/domains/recognition/domain/capture/capture-repository';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import type { TagRepository } from '$lib/domains/recognition/domain/tag/tag-repository';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, contentHash, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { applyCapturesImport } from './apply-captures-import';
import type {
  ApplyCapturesImportDeps,
  ConflictChoice,
  ConflictResolution,
} from './apply-captures-import';
import { buildCapturesFile } from './build-captures-file';
import type { CapturesImportPlan } from './captures-import-plan';
import { previewCapturesImport } from './preview-captures-import';
import type { PreviewCapturesImportDeps } from './preview-captures-import';

type Fault = 'none' | 'records' | 'tags' | 'captures';

type World = {
  readonly shelf: Book[];
  readonly removed: Map<BookId, RemovedBook>;
  readonly tags: Map<TagId, Tag>;
  readonly captures: Map<CaptureId, Capture>;
  readonly writes: string[];
  readonly deleted: string[];
  fault: Fault;
  clock: number;
  minted: number;
};

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

function shelfBook(id: string, title: string, hash: string, fileName: string): Book {
  return {
    id: bookId(id),
    title,
    alias: null,
    seriesId: null,
    volume: null,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'auto',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash(hash),
    fileName,
    imageCount: 100,
    addedAt: 1,
    position: imagePlace(imageIndex(0)),
    lastReadAt: null,
    finishedAt: null,
  };
}

function recognized(
  id: string,
  book: string,
  fields: Partial<Omit<RecognizedCapture, 'origin'>> = {},
): Capture {
  return {
    id: captureId(id),
    bookId: bookId(book),
    anchor: regionAnchor([{ index: imageIndex(4), rect: pageRect(0.01, 0.02, 0.03, 0.04) }]),
    text: `text of ${id}`,
    origin: 'recognized',
    confidence: null,
    note: null,
    createdAt: 100,
    editedAt: null,
    tagIds: [],
    ...fields,
  };
}

function world(shelf: readonly Book[]): World {
  return {
    shelf: [...shelf],
    removed: new Map(),
    tags: new Map(),
    captures: new Map(),
    writes: [],
    deleted: [],
    fault: 'none',
    clock: 1000,
    minted: 0,
  };
}

function hold(into: World, tags: readonly Tag[], captures: readonly Capture[]): void {
  for (const tag of tags) into.tags.set(tag.id, tag);
  for (const capture of captures) into.captures.set(capture.id, capture);
}

function exported(from: World): string {
  return buildCapturesFile({
    books: from.shelf,
    removedBooks: [...from.removed.values()],
    unreadableRemovedBooks: [],
    tags: [...from.tags.values()],
    captures: [...from.captures.values()],
    exportedAt: 1,
    appVersion: '0.9.3',
  }).json;
}

function repositories(into: World) {
  const repository: LibraryRepository = {
    list: () => Promise.resolve({ kind: 'success', books: [...into.shelf], unreadable: [] }),
    get: notUsed,
    add: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    remove: (id) => {
      into.deleted.push(id);
      return notUsed();
    },
    listRemoved: notUsed,
    listRestorable: () =>
      Promise.resolve({ kind: 'success', removed: [...into.removed.values()], unreadable: [] }),
    addRemoved: (book) => {
      if (into.fault === 'records') return Promise.resolve(STORAGE_UNAVAILABLE);
      into.writes.push(`record ${book.id}`);
      into.removed.set(book.id, book);
      return Promise.resolve({ kind: 'success' });
    },
    forgetRemoved: (id) => {
      into.deleted.push(id);
      return notUsed();
    },
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  };
  const tags: TagRepository = {
    list: () => Promise.resolve({ kind: 'success', tags: [...into.tags.values()], unreadable: [] }),
    save: (tag) => {
      if (into.fault === 'tags') return Promise.resolve(STORAGE_UNAVAILABLE);
      into.writes.push(`tag ${tag.id}`);
      into.tags.set(tag.id, tag);
      return Promise.resolve({ kind: 'success' });
    },
    remove: (id) => {
      into.deleted.push(id);
      return notUsed();
    },
  };
  const captures: CaptureRepository = {
    listForBook: notUsed,
    listEverything: () =>
      Promise.resolve({ kind: 'success', captures: [...into.captures.values()], unreadable: [] }),
    save: (capture) => {
      if (into.fault === 'captures') return Promise.resolve(STORAGE_UNAVAILABLE);
      into.writes.push(`capture ${capture.id}`);
      into.captures.set(capture.id, capture);
      return Promise.resolve({ kind: 'success' });
    },
    remove: (id) => {
      into.deleted.push(id);
      return notUsed();
    },
    clearBook: (id) => {
      into.deleted.push(id);
      return notUsed();
    },
    moveBook: notUsed,
    untagEverywhere: notUsed,
  };
  return { repository, tags, captures };
}

function previewDeps(into: World): PreviewCapturesImportDeps {
  const { repository, tags, captures } = repositories(into);
  return {
    shelf: { repository },
    restorable: { repository },
    tags: { tags },
    captures: { captures },
    newId: () => {
      into.minted += 1;
      return `minted-${into.minted}`;
    },
    now: () => into.clock,
  };
}

function applyDeps(into: World): ApplyCapturesImportDeps {
  const { repository, tags, captures } = repositories(into);
  return {
    holding: { repository },
    tagging: { tags },
    saving: { captures },
    now: () => into.clock,
  };
}

const HASH = '0123456789abcdef0123456789abcdef';

const KIKI_HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const YOTSUBA_THERE = shelfBook('there-yotsuba', 'Yotsuba&! 1', HASH, 'yotsuba-1.cbz');

const KIKI_THERE = shelfBook('there-kiki', 'Kiki', KIKI_HASH, 'kiki.epub');

const YOTSUBA_HERE = shelfBook('here-yotsuba', 'Yotsuba&! 1', HASH, 'yotsuba-1.cbz');

const OTHER_HERE = shelfBook(
  'here-other',
  'Other',
  'fedcba9876543210fedcba9876543210',
  'other.cbz',
);

const KANJI: Tag = { id: tagId('tag-kanji'), name: 'kanji', colour: 'sage', createdAt: 10 };

const SFX: Tag = { id: tagId('tag-sfx'), name: 'sfx', colour: 'clay', createdAt: 11 };

const NEWER: ConflictResolution = { kind: 'newer' };

async function planned(from: World, into: World): Promise<CapturesImportPlan> {
  const preview = await previewCapturesImport(previewDeps(into), exported(from));
  if (preview.kind !== 'success') throw new Error(preview.kind);
  return preview.plan;
}

async function imported(from: World, into: World, resolution: ConflictResolution = NEWER) {
  const plan = await planned(from, into);
  return applyCapturesImport(applyDeps(into), plan, resolution);
}

function held(into: World, id: string): Capture | undefined {
  return into.captures.get(captureId(id));
}

type Sides = { readonly there: World; readonly here: World };

function conflicting(fileEdited: number | null, deviceEdited: number | null): Sides {
  const there = world([YOTSUBA_THERE]);
  hold(
    there,
    [SFX],
    [
      recognized('c1', 'there-yotsuba', {
        text: 'from file',
        note: 'file note',
        editedAt: fileEdited,
        tagIds: [SFX.id],
      }),
    ],
  );
  const here = world([YOTSUBA_HERE]);
  hold(
    here,
    [KANJI],
    [
      recognized('c1', 'here-yotsuba', {
        text: 'from device',
        editedAt: deviceEdited,
        tagIds: [KANJI.id],
      }),
    ],
  );
  return { there, here };
}

function reviewed(choice: ConflictChoice): ConflictResolution {
  return { kind: 'review', choices: new Map([[captureId('c1'), choice]]) };
}

describe('applyCapturesImport', () => {
  it('adds a new capture under the shelf book the file book matched', async () => {
    const there = world([YOTSUBA_THERE]);
    hold(there, [], [recognized('c1', 'there-yotsuba')]);
    const here = world([YOTSUBA_HERE]);

    const result = await imported(there, here);

    expect(result).toEqual({
      kind: 'imported',
      counts: { added: 1, updated: 0, kept: 0, held: 0, tagsCreated: 0 },
    });
    expect(held(here, 'c1')).toEqual(recognized('c1', 'here-yotsuba'));
  });

  it('holds the captures of a book not on this device under one new removed record', async () => {
    const there = world([KIKI_THERE]);
    hold(there, [], [recognized('k1', 'there-kiki'), recognized('k2', 'there-kiki')]);
    const here = world([YOTSUBA_HERE]);

    const result = await imported(there, here);

    expect(result).toMatchObject({ kind: 'imported', counts: { added: 2, held: 2 } });
    expect([...here.removed.values()]).toEqual([
      {
        ...KIKI_THERE,
        id: 'minted-1',
        addedAt: 1000,
        position: imagePlace(imageIndex(0)),
        removedAt: 1000,
      },
    ]);
    expect([held(here, 'k1')?.bookId, held(here, 'k2')?.bookId]).toEqual(['minted-1', 'minted-1']);
  });

  it('writes the book records, then the tags, then the captures', async () => {
    const there = world([KIKI_THERE]);
    hold(there, [SFX], [recognized('k1', 'there-kiki', { tagIds: [SFX.id] })]);
    const here = world([]);

    await imported(there, here);

    expect(here.writes).toEqual(['record minted-1', 'tag tag-sfx', 'capture k1']);
  });

  it('creates a file tag under its own id and colour', async () => {
    const there = world([YOTSUBA_THERE]);
    hold(there, [SFX], [recognized('c1', 'there-yotsuba', { tagIds: [SFX.id] })]);
    const here = world([YOTSUBA_HERE]);

    const result = await imported(there, here);

    expect(result).toMatchObject({ counts: { tagsCreated: 1 } });
    expect([...here.tags.values()]).toEqual([SFX]);
    expect(held(here, 'c1')?.tagIds).toEqual([SFX.id]);
  });

  it('writes nothing on a second import of the same file', async () => {
    const there = world([YOTSUBA_THERE, KIKI_THERE]);
    hold(
      there,
      [SFX],
      [recognized('c1', 'there-yotsuba', { tagIds: [SFX.id] }), recognized('k1', 'there-kiki')],
    );
    const here = world([YOTSUBA_HERE]);
    await imported(there, here);
    here.writes.length = 0;

    const plan = await planned(there, here);
    const again = await applyCapturesImport(applyDeps(here), plan, NEWER);

    expect(plan.summary).toMatchObject({ added: 0, identical: 2, conflicts: 0, newTags: 0 });
    expect(plan.records).toEqual([]);
    expect(again).toEqual({
      kind: 'imported',
      counts: { added: 0, updated: 0, kept: 0, held: 0, tagsCreated: 0 },
    });
    expect(here.writes).toEqual([]);
  });

  it('leaves the same holdings when the same plan is applied twice', async () => {
    const there = world([KIKI_THERE]);
    hold(there, [SFX], [recognized('k1', 'there-kiki', { tagIds: [SFX.id] })]);
    const { here } = conflicting(500, 100);
    const plan = await planned(there, here);

    await applyCapturesImport(applyDeps(here), plan, NEWER);
    const once = { removed: [...here.removed], tags: [...here.tags], captures: [...here.captures] };
    await applyCapturesImport(applyDeps(here), plan, NEWER);

    expect({
      removed: [...here.removed],
      tags: [...here.tags],
      captures: [...here.captures],
    }).toEqual(once);
    expect(here.removed.size).toBe(1);
  });

  it('deletes no local capture the file lacks', async () => {
    const there = world([YOTSUBA_THERE]);
    hold(there, [], [recognized('c1', 'there-yotsuba')]);
    const here = world([YOTSUBA_HERE]);
    hold(here, [], [recognized('mine', 'here-yotsuba')]);

    await imported(there, here);

    expect(held(here, 'mine')).toEqual(recognized('mine', 'here-yotsuba'));
    expect(here.deleted).toEqual([]);
  });

  it('keeps the file version when its edit is newer, with the tags of both sides', async () => {
    const { there, here } = conflicting(500, 100);

    const result = await imported(there, here, NEWER);

    expect(result).toMatchObject({ counts: { updated: 1, kept: 0 } });
    expect(held(here, 'c1')).toMatchObject({
      bookId: 'here-yotsuba',
      text: 'from file',
      note: 'file note',
      editedAt: 500,
      tagIds: [KANJI.id, SFX.id],
    });
  });

  it('keeps this device version when its edit is newer, with the tags of both sides', async () => {
    const { there, here } = conflicting(100, 500);

    const result = await imported(there, here, NEWER);

    expect(result).toMatchObject({ counts: { updated: 0, kept: 1 } });
    expect(held(here, 'c1')).toMatchObject({
      text: 'from device',
      note: null,
      tagIds: [KANJI.id, SFX.id],
    });
  });

  it('keeps this device version when both edits carry the same time', async () => {
    const { there, here } = conflicting(300, 300);

    await imported(there, here, NEWER);

    expect(held(here, 'c1')?.text).toBe('from device');
  });

  it('weighs a capture never edited by its creation time', async () => {
    const { there, here } = conflicting(50, null);

    await imported(there, here, NEWER);

    expect(held(here, 'c1')?.text).toBe('from device');
  });

  it('keeps this device text and note for every conflict when asked, still uniting the tags', async () => {
    const { there, here } = conflicting(500, 100);

    const result = await imported(there, here, { kind: 'this-device' });

    expect(result).toMatchObject({ counts: { updated: 0, kept: 1 } });
    expect(held(here, 'c1')).toMatchObject({ text: 'from device', tagIds: [KANJI.id, SFX.id] });
  });

  it('writes nothing for a conflict kept on this device when the file adds no tag', async () => {
    const { there, here } = conflicting(500, 100);
    hold(
      here,
      [SFX],
      [recognized('c1', 'here-yotsuba', { text: 'from device', tagIds: [SFX.id] })],
    );

    await imported(there, here, { kind: 'this-device' });

    expect(here.writes).toEqual([]);
  });

  it('keeps the chosen side of a reviewed conflict', async () => {
    const fromDevice = conflicting(500, 100);
    const fromFile = conflicting(100, 500);

    await imported(fromDevice.there, fromDevice.here, reviewed({ kind: 'device' }));
    await imported(fromFile.there, fromFile.here, reviewed({ kind: 'file' }));

    expect(held(fromDevice.here, 'c1')?.text).toBe('from device');
    expect(held(fromFile.here, 'c1')?.text).toBe('from file');
  });

  it('keeps this device version for a reviewed conflict left without a choice', async () => {
    const { there, here } = conflicting(500, 100);

    await imported(there, here, { kind: 'review', choices: new Map() });

    expect(held(here, 'c1')?.text).toBe('from device');
  });

  it('stores a hand edit of a reviewed conflict, trimmed, with the time of the edit', async () => {
    const { there, here } = conflicting(500, 100);

    const result = await imported(
      there,
      here,
      reviewed({ kind: 'edit', text: '  by hand  ', note: ' both read ' }),
    );

    expect(result).toMatchObject({ counts: { updated: 1 } });
    expect(held(here, 'c1')).toMatchObject({
      bookId: 'here-yotsuba',
      text: 'by hand',
      note: 'both read',
      editedAt: 1000,
      tagIds: [KANJI.id, SFX.id],
    });
  });

  it('keeps a held capture on its local book when the file holds it under another', async () => {
    const { there } = conflicting(500, 100);
    const here = world([YOTSUBA_HERE, OTHER_HERE]);
    hold(here, [], [recognized('c1', 'here-other', { text: 'from device', editedAt: 100 })]);

    const plan = await planned(there, here);
    await applyCapturesImport(applyDeps(here), plan, NEWER);

    expect(plan.summary.onAnotherBook).toBe(1);
    expect(held(here, 'c1')).toMatchObject({ bookId: 'here-other', text: 'from file' });
  });

  it.each(['records', 'tags', 'captures'] as const)(
    'reports storage-unavailable when the %s write is refused',
    async (fault) => {
      const there = world([KIKI_THERE]);
      hold(there, [SFX], [recognized('k1', 'there-kiki', { tagIds: [SFX.id] })]);
      const here = world([]);
      const plan = await planned(there, here);
      here.fault = fault;

      const result = await applyCapturesImport(applyDeps(here), plan, NEWER);

      expect(result).toEqual(STORAGE_UNAVAILABLE);
    },
  );
});
