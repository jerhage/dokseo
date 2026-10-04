import type { LibraryRepository } from '$lib/domains/library/domain/book/library-repository';
import type { RemovedBook } from '$lib/domains/library/domain/book/removed-book';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { CaptureRepository } from '$lib/domains/recognition/domain/capture/capture-repository';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import type { TagRepository } from '$lib/domains/recognition/domain/tag/tag-repository';
import type { ApplyCapturesImportDeps } from '../../use-cases/apply-captures-import';
import type { PreviewCapturesImportDeps } from '../../use-cases/preview-captures-import';
import type { Holdings } from './sample-holdings';

type DeviceName = 'phone' | 'laptop';

type Minting = {
  readonly newId: () => string;
  readonly now: () => number;
};

type Repositories = {
  readonly library: LibraryRepository;
  readonly tags: TagRepository;
  readonly captures: CaptureRepository;
};

const SUCCESS = { kind: 'success' } as const;

const NOTHING_HELD: Holdings = { books: [], removedBooks: [], tags: [], captures: [] };

function notInTheDemo(): Promise<never> {
  return Promise.reject(new Error('The demo device does not do this'));
}

function upserted<T extends { readonly id: string }>(list: readonly T[], item: T): readonly T[] {
  return list.some((held) => held.id === item.id)
    ? list.map((held) => (held.id === item.id ? item : held))
    : [...list, item];
}

class SimulatedDevice {
  readonly name: DeviceName;
  #holdings = $state.raw<Holdings>(NOTHING_HELD);
  #writes = $state(0);

  constructor(name: DeviceName, holdings: Holdings) {
    this.name = name;
    this.#holdings = holdings;
  }

  get holdings(): Holdings {
    return this.#holdings;
  }

  get writes(): number {
    return this.#writes;
  }

  replace(holdings: Holdings): void {
    this.#holdings = holdings;
  }

  previewDeps(minting: Minting): PreviewCapturesImportDeps {
    const { library, tags, captures } = this.#repositories();
    return {
      shelf: { repository: library },
      restorable: { repository: library },
      tags: { tags },
      captures: { captures },
      newId: minting.newId,
      now: minting.now,
    };
  }

  applyDeps(now: () => number): ApplyCapturesImportDeps {
    const { library, tags, captures } = this.#repositories();
    return {
      holding: { repository: library },
      tagging: { tags },
      saving: { captures },
      now,
    };
  }

  #written(holdings: Holdings): Promise<typeof SUCCESS> {
    this.#holdings = holdings;
    this.#writes += 1;
    return Promise.resolve(SUCCESS);
  }

  #repositories(): Repositories {
    const library: LibraryRepository = {
      list: () => Promise.resolve({ kind: 'success', books: this.#holdings.books, unreadable: [] }),
      get: notInTheDemo,
      add: notInTheDemo,
      readPageList: notInTheDemo,
      savePageList: notInTheDemo,
      remove: notInTheDemo,
      listRemoved: () => Promise.resolve({ kind: 'success', removed: this.#holdings.removedBooks }),
      listRestorable: () =>
        Promise.resolve({
          kind: 'success',
          removed: this.#holdings.removedBooks,
          unreadable: [],
        }),
      addRemoved: (book: RemovedBook) =>
        this.#written({
          ...this.#holdings,
          removedBooks: upserted(this.#holdings.removedBooks, book),
        }),
      forgetRemoved: notInTheDemo,
      update: notInTheDemo,
      readSource: notInTheDemo,
      readCover: notInTheDemo,
      storedBytes: notInTheDemo,
    };
    const tags: TagRepository = {
      list: () => Promise.resolve({ kind: 'success', tags: this.#holdings.tags, unreadable: [] }),
      save: (tag: Tag) =>
        this.#written({ ...this.#holdings, tags: upserted(this.#holdings.tags, tag) }),
      remove: notInTheDemo,
    };
    const captures: CaptureRepository = {
      listForBook: notInTheDemo,
      listEverything: () =>
        Promise.resolve({ kind: 'success', captures: this.#holdings.captures, unreadable: [] }),
      save: (capture: Capture) =>
        this.#written({
          ...this.#holdings,
          captures: upserted(this.#holdings.captures, capture),
        }),
      remove: notInTheDemo,
      clearBook: notInTheDemo,
      moveBook: notInTheDemo,
    };
    return { library, tags, captures };
  }
}

export { SimulatedDevice };
export type { DeviceName, Minting };
