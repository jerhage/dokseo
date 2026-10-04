import { describe, expect, it } from 'vitest';
import { upgrade } from './recognition-database';

type IndexOptions = { readonly unique?: boolean; readonly multiEntry?: boolean };

type MadeIndex = {
  readonly store: string;
  readonly name: string;
  readonly keyPath: string;
  readonly options: IndexOptions;
};

class FakeStore {
  readonly name: string;
  readonly indexes: string[];
  readonly #made: MadeIndex[];

  constructor(name: string, indexes: readonly string[], made: MadeIndex[]) {
    this.name = name;
    this.indexes = [...indexes];
    this.#made = made;
  }

  get indexNames() {
    return { contains: (index: string) => this.indexes.includes(index) };
  }

  createIndex(name: string, keyPath: string, options: IndexOptions): void {
    this.indexes.push(name);
    this.#made.push({ store: this.name, name, keyPath, options });
  }
}

function database(held: Readonly<Record<string, readonly string[]>>) {
  const made: MadeIndex[] = [];
  const createdStores: string[] = [];
  const stores = new Map(
    Object.entries(held).map(([name, indexes]) => [name, new FakeStore(name, indexes, made)]),
  );

  const db = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string) => {
      const store = new FakeStore(name, [], made);
      stores.set(name, store);
      createdStores.push(name);
      return store;
    },
  };
  const upgrading = {
    objectStore: (name: string) => {
      const store = stores.get(name);
      if (store === undefined) throw new Error(`no store ${name}`);
      return store;
    },
  };

  return {
    run: () => upgrade(db as unknown as IDBDatabase, upgrading as unknown as IDBTransaction),
    made,
    createdStores,
  };
}

const TAG_INDEX: MadeIndex = {
  store: 'captures',
  name: 'tagIds',
  keyPath: 'tagIds',
  options: { unique: false, multiEntry: true },
};

describe('upgrade', () => {
  it('creates every store, the book index and the multi-entry tag index in an empty database', () => {
    const fresh = database({});

    fresh.run();

    expect(fresh.createdStores).toEqual(['model-consent', 'captures', 'recognizer-setup', 'tags']);
    expect(fresh.made).toEqual([
      { store: 'captures', name: 'bookId', keyPath: 'bookId', options: { unique: false } },
      TAG_INDEX,
    ]);
  });

  it('adds only the multi-entry tag index to the captures store a version 4 database holds', () => {
    const fourth = database({
      'model-consent': [],
      captures: ['bookId'],
      'recognizer-setup': [],
      tags: [],
    });

    fourth.run();

    expect(fourth.createdStores).toEqual([]);
    expect(fourth.made).toEqual([TAG_INDEX]);
  });

  it('creates nothing in a database that already holds every store and index', () => {
    const fifth = database({
      'model-consent': [],
      captures: ['bookId', 'tagIds'],
      'recognizer-setup': [],
      tags: [],
    });

    fifth.run();

    expect([fifth.createdStores, fifth.made]).toEqual([[], []]);
  });
});
