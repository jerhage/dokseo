import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Size } from '$lib/shared/geometry';
import { imageIndex, type BookId, type ImageIndex } from '$lib/shared/ids';
import type { PagePairing, ReadingDirection } from '$lib/shared/layout-kind';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import { pairPages, type PageGroup } from '../domain/page-pairing';
import {
  groupOf,
  positionOfGroup,
  readingPosition,
  type ReadingPosition,
} from '../domain/reading-position';

type OpenOutcome = Awaited<ReturnType<Container['library']['openForReading']>>;

type EditOutcome = Awaited<ReturnType<Container['library']['editBook']>>;

type BookEdit = Parameters<Container['library']['editBook']>[1];

type OpenedBook = Extract<OpenOutcome, { readonly ok: true }>['value'];

type OpenFailure = Extract<OpenOutcome, { readonly ok: false }>['error'];

type EditFailure = Extract<EditOutcome, { readonly ok: false }>['error'];

export type ReaderBook = OpenedBook['book'];

export type ReaderStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'failed';

const NO_PAGES: PageGroup = [];

function describeEditFailure(error: EditFailure): string {
  return match(error)
    .with({ kind: 'not-found' }, () => 'That book is no longer in your library.')
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so your place cannot be kept.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

function describeSourceFailure(error: PageSourceError): string {
  return match(error)
    .with(
      { kind: 'out-of-range' },
      (range) => `This book holds ${range.count} images, so page ${range.index + 1} is not there.`,
    )
    .with({ kind: 'decode-failed' }, (failed) => `A page could not be decoded: ${failed.cause}`)
    .with(
      { kind: 'source-unreadable' },
      (unreadable) => `That book could not be read: ${unreadable.cause}`,
    )
    .exhaustive();
}

function describeOpenFailure(error: OpenFailure): string {
  if (error.kind === 'source') return describeSourceFailure(error.error);
  if (error.kind === 'library') return describeEditFailure(error.error);
  const unhandled: never = error;
  return unhandled;
}

function unmeasured(count: number): readonly (Size | null)[] {
  return Array.from({ length: Math.max(count, 0) }, () => null);
}

export class ReaderView {
  status = $state<ReaderStatus>('idle');
  message = $state<string | null>(null);
  book = $state.raw<ReaderBook | null>(null);
  saving = $state(false);
  sizes = $state.raw<readonly (Size | null)[]>([]);
  groups = $state.raw<readonly PageGroup[]>([]);
  position = $state.raw<ReadingPosition>(readingPosition(imageIndex(0), 0));

  #container: Container;
  #source: PageSource | null = null;
  #generation = 0;

  constructor(container: Container) {
    this.#container = container;
  }

  get group(): number {
    const found = groupOf(this.groups, this.position);
    return found < 0 ? 0 : found;
  }

  get visiblePages(): PageGroup {
    return this.groups[this.group] ?? NO_PAGES;
  }

  async open(id: BookId): Promise<void> {
    const generation = ++this.#generation;
    this.#release();
    this.status = 'loading';
    this.message = null;
    this.book = null;
    this.sizes = [];
    this.groups = [];

    let opened: OpenOutcome;
    try {
      opened = await this.#container.library.openForReading(id);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.status = 'failed';
      this.message = `That book could not be opened: ${String(cause)}`;
      return;
    }

    if (generation !== this.#generation) {
      if (opened.ok) opened.value.pages.close();
      return;
    }

    if (!opened.ok) {
      this.status = 'failed';
      this.message = describeOpenFailure(opened.error);
      return;
    }

    const { book, pages } = opened.value;
    this.#source = pages;
    this.book = book;
    this.#regroup(book, unmeasured(book.imageCount));
    this.position = readingPosition(book.position, 0);
    this.status = this.groups.length === 0 ? 'empty' : 'ready';
  }

  async imageAt(index: ImageIndex): Promise<ImageBitmap | null> {
    const source = this.#source;
    if (source === null) return null;
    const generation = this.#generation;

    let got: Awaited<ReturnType<PageSource['image']>>;
    try {
      got = await source.image(index);
    } catch {
      return null;
    }

    if (generation !== this.#generation) {
      if (got.ok) got.value.close();
      return null;
    }

    if (!got.ok) return null;

    this.#measure(index, { width: got.value.width, height: got.value.height });
    return got.value;
  }

  next(): Promise<void> {
    return this.goToGroup(this.group + 1);
  }

  previous(): Promise<void> {
    return this.goToGroup(this.group - 1);
  }

  async goToGroup(target: number): Promise<void> {
    const book = this.book;
    if (book === null || target === this.group) return;

    const moved = positionOfGroup(this.groups, target);
    if (moved === null) return;

    this.position = moved;
    await this.#persist(book.id, moved.index);
  }

  async setPairing(pairing: PagePairing): Promise<void> {
    const book = this.book;
    if (book === null || this.saving || book.pagePairing === pairing) return;
    await this.#edit(book.id, { pagePairing: pairing });
  }

  async setDirection(direction: ReadingDirection): Promise<void> {
    const book = this.book;
    if (book === null || this.saving || book.direction === direction) return;
    await this.#edit(book.id, { direction });
  }

  dispose(): void {
    this.#generation += 1;
    this.#release();
    this.book = null;
    this.sizes = [];
    this.groups = [];
    this.status = 'idle';
    this.message = null;
    this.saving = false;
  }

  async #edit(id: BookId, edit: BookEdit): Promise<void> {
    const generation = this.#generation;
    this.saving = true;
    this.message = null;

    try {
      const saved = await this.#container.library.editBook(id, edit);
      if (generation !== this.#generation) return;
      if (!saved.ok) {
        this.message = describeEditFailure(saved.error);
        return;
      }
      this.book = saved.value;
      this.#regroup(saved.value, this.sizes);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.message = `That change could not be saved: ${String(cause)}`;
    } finally {
      this.saving = false;
    }
  }

  #measure(index: ImageIndex, size: Size): void {
    const book = this.book;
    if (book === null || index < 0 || index >= this.sizes.length) return;

    const known = this.sizes[index] ?? null;
    if (known !== null && known.width === size.width && known.height === size.height) return;

    const sizes = [...this.sizes];
    sizes[index] = size;
    this.#regroup(book, sizes);
  }

  #regroup(book: ReaderBook, sizes: readonly (Size | null)[]): void {
    this.sizes = sizes;
    this.groups = pairPages(sizes, book.pagePairing);
  }

  async #persist(id: BookId, index: ImageIndex): Promise<void> {
    const generation = this.#generation;

    try {
      const saved = await this.#container.library.editBook(id, { position: index });
      if (generation !== this.#generation) return;
      if (!saved.ok) this.message = describeEditFailure(saved.error);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.message = `Your place could not be saved: ${String(cause)}`;
    }
  }

  #release(): void {
    this.#source?.close();
    this.#source = null;
  }
}
