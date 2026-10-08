import { match } from 'ts-pattern';
import type { RemoteItem } from '../domain/remote-item';
import type { CatalogDownloads, QueuedDownload } from './catalog-downloads.svelte';

const NOTHING: ReadonlySet<string> = new Set();

function isSelectable(item: RemoteItem): boolean {
  return match(item)
    .returnType<boolean>()
    .with({ kind: 'remote' }, { kind: 'download-failed' }, () => true)
    .with(
      { kind: 'unsupported' },
      { kind: 'downloading' },
      { kind: 'held' },
      { kind: 'held-older' },
      () => false,
    )
    .exhaustive();
}

class CatalogSelection {
  #chosen = $state.raw<ReadonlySet<string>>(NOTHING);
  #downloads: CatalogDownloads;
  #entries: () => readonly QueuedDownload[];
  #keep: (ids: ReadonlySet<string>) => void;

  constructor(
    downloads: CatalogDownloads,
    entries: () => readonly QueuedDownload[],
    keep: (ids: ReadonlySet<string>) => void,
  ) {
    this.#downloads = downloads;
    this.#entries = entries;
    this.#keep = keep;
  }

  get selectable(): readonly QueuedDownload[] {
    return this.#entries().filter(({ publication }) =>
      isSelectable(this.#downloads.itemFor(publication)),
    );
  }

  get chosen(): readonly QueuedDownload[] {
    return this.selectable.filter(({ publication }) => this.#chosen.has(publication.entryId));
  }

  get count(): number {
    return this.chosen.length;
  }

  has(entryId: string): boolean {
    return this.#chosen.has(entryId);
  }

  toggle(entryId: string): void {
    const next = new Set(this.#chosen);
    if (!next.delete(entryId)) next.add(entryId);
    this.#set(next);
  }

  selectAll(): void {
    this.#set(new Set(this.selectable.map(({ publication }) => publication.entryId)));
  }

  clear(): void {
    this.#set(NOTHING);
  }

  restore(ids: ReadonlySet<string>): void {
    this.#set(ids);
  }

  reset(): void {
    this.#chosen = NOTHING;
  }

  downloadSelected(): Promise<void> {
    return this.#downloads.downloadAll(this.chosen, ({ entryId }) => this.#drop(entryId));
  }

  #drop(entryId: string): void {
    if (!this.#chosen.has(entryId)) return;
    const next = new Set(this.#chosen);
    next.delete(entryId);
    this.#set(next);
  }

  #set(ids: ReadonlySet<string>): void {
    this.#chosen = ids;
    this.#keep(ids);
  }
}

export { CatalogSelection, isSelectable };
