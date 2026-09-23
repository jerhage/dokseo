import { describe, expect, it } from 'vitest';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Container } from '$lib/container';
import { regionAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import type { CaptureError } from '../../domain/capture/capture-repository';
import { taggedCapture } from '../../domain/tag/capture-tags';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError } from '../../domain/tag/tag-repository';
import { recognizedText } from '../../domain/engine/recognized-text';
import { CaptureCollection } from './capture-collection.svelte';
import type { Settled } from './capture-collection.svelte';

type Step = {
  readonly label: string;
  readonly name: string;
  readonly detail: Record<string, unknown>;
};

type Store = {
  rows: Capture[];
  tags: readonly Tag[];
};

type Fakes = {
  readonly container: Container;
  readonly store: Store;
  readonly steps: Step[];
};

function unused(): never {
  throw new Error('The capture collection does not use this');
}

function fakes(): Fakes {
  const store: Store = { rows: [], tags: [] };
  const steps: Step[] = [];

  const container: Container = {
    beginTrace: (label: string): Trace => ({
      step: (name: string, detail: Record<string, unknown>): void => {
        steps.push({ label, name, detail });
      },
      image: (): void => undefined,
      end: (): void => undefined,
    }),
    library: {
      openFile: unused,
      openForReading: unused,
      listBooks: unused,
      readBook: unused,
      readCover: unused,
      readSource: unused,
      removeBook: unused,
      editBook: unused,
      readLibrarySize: unused,
    },
    recognition: {
      readModelConsent: unused,
      grantModelConsent: unused,
      recognizeRegion: unused,
      listCaptures: (book: BookId): Promise<Result<readonly Capture[], CaptureError>> =>
        Promise.resolve(ok(store.rows.filter((row) => row.bookId === book))),
      listEveryCapture: (): Promise<Result<readonly Capture[], CaptureError>> =>
        Promise.resolve(ok([...store.rows])),
      saveCapture: (draft: CaptureDraft): Promise<Result<Capture, CaptureError>> => {
        const kept = takenCapture(draft, store.rows.length + 1);
        store.rows = [...store.rows, kept];
        return Promise.resolve(ok(kept));
      },
      writeNote: (
        id: CaptureId,
        book: BookId,
        taken: Anchor,
      ): Promise<Result<Capture, CaptureError>> => {
        const note = takenCapture(
          { id, bookId: book, anchor: taken, text: '', origin: 'written' },
          store.rows.length + 1,
        );
        store.rows = [...store.rows, note];
        return Promise.resolve(ok(note));
      },
      editCaptureText: unused,
      writeCaptureNote: unused,
      removeCapture: unused,
      clearCaptures: (book: BookId): Promise<Result<void, CaptureError>> => {
        store.rows = store.rows.filter((row) => row.bookId !== book);
        return Promise.resolve(ok(undefined));
      },
      listTags: (): Promise<Result<readonly Tag[], TagError>> => Promise.resolve(ok(store.tags)),
      createTag: unused,
      addTagToCapture: (capture: Capture, tag: TagId): Promise<Result<Capture, CaptureError>> => {
        const tagged = taggedCapture(capture, tag);
        store.rows = store.rows.map((row) => (row.id === tagged.id ? tagged : row));
        return Promise.resolve(ok(tagged));
      },
      removeTagFromCapture: unused,
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

  return { container, store, steps };
}

const ONE = bookId('book-one');

const TWO = bookId('book-two');

const CROWN = tagId('tag-crown');

function regions(index = 13): readonly ImageRegion[] {
  return [{ index: imageIndex(index), rect: imageRect(0, 0, 40, 20) }];
}

function storedRow(id: string, book: BookId, text: string, createdAt: number): Capture {
  return {
    id: captureId(id),
    bookId: book,
    anchor: regionAnchor(regions(4)),
    text,
    note: null,
    confidence: null,
    origin: 'recognized',
    createdAt,
    editedAt: null,
    tagIds: [],
  };
}

function panelTexts(collection: CaptureCollection): readonly string[] {
  return collection.captures.map((capture) =>
    capture.status === 'done' ? capture.text.text : capture.status,
  );
}

function settles(settled: Settled): () => Promise<Settled> {
  return () => Promise.resolve(settled);
}

describe('CaptureCollection', () => {
  it('lists the stored captures of the book it opens oldest first', async () => {
    const world = fakes();
    world.store.rows = [storedRow('two', ONE, '後', 2), storedRow('one', ONE, '先', 1)];
    world.store.rows.push(storedRow('other', TWO, '別', 3));
    const collection = new CaptureCollection(world.container);

    await collection.open(ONE);

    expect(panelTexts(collection)).toEqual(['先', '後']);
  });

  it('settles the pending card the recognition returns and stores the text', async () => {
    const world = fakes();
    const collection = new CaptureCollection(world.container);
    await collection.open(ONE);

    await collection.recognizing(
      regions(),
      settles({ status: 'done', text: recognizedText('読', null), edited: false }),
    );

    expect(panelTexts(collection)).toEqual(['読']);
    expect(world.store.rows.map((row) => row.text)).toEqual(['読']);
  });

  it('stores nothing for a recognition that read no text', async () => {
    const world = fakes();
    const collection = new CaptureCollection(world.container);
    await collection.open(ONE);

    await collection.recognizing(regions(), settles({ status: 'empty' }));

    expect(panelTexts(collection)).toEqual(['empty']);
    expect(world.store.rows).toEqual([]);
  });

  it('stores nothing for a note when no book is open', () => {
    const world = fakes();
    const collection = new CaptureCollection(world.container);

    collection.note(regions());

    expect(collection.captures).toEqual([]);
    expect(world.steps.map((step) => step.detail.guard)).toEqual(['no-open-book']);
  });

  it('puts a tag on the capture, on its card and in the library counts', async () => {
    const world = fakes();
    world.store.rows = [storedRow('one', ONE, '先', 1)];
    world.store.tags = [namedTag(CROWN, 'crown', 'slate', 1)];
    const collection = new CaptureCollection(world.container);
    await collection.open(ONE);
    await collection.loadTagCounts();

    await collection.addTag(captureId('one'), CROWN);

    expect(collection.captures.map((capture) => capture.tagIds)).toEqual([[CROWN]]);
    expect(collection.libraryCounts.get(CROWN)).toBe(1);
    expect(collection.bookCounts.get(CROWN)).toBe(1);
  });

  it('empties the list and the store of the open book when it is cleared', async () => {
    const world = fakes();
    world.store.rows = [storedRow('one', ONE, '先', 1), storedRow('other', TWO, '別', 2)];
    const collection = new CaptureCollection(world.container);
    await collection.open(ONE);

    await collection.clear();

    expect(collection.captures).toEqual([]);
    expect(collection.count).toBe(0);
    expect(world.store.rows.map((row) => row.id)).toEqual([captureId('other')]);
  });
});
