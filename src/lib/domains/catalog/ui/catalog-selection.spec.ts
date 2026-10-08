import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import type { DownloadPublicationResult } from '../use-cases/download-publication';
import { CatalogDownloads } from './catalog-downloads.svelte';
import type { QueuedDownload } from './catalog-downloads.svelte';
import { CatalogSelection } from './catalog-selection.svelte';
import { publication } from './catalog-ui-fixtures';

function setup(ids: readonly string[], unsupported: readonly string[] = []) {
  const started: string[] = [];
  const finishers: ((result: DownloadPublicationResult) => void)[] = [];
  const downloads = new CatalogDownloads(
    {
      updatePublication: () => Promise.resolve({ kind: 'aborted' }),
      downloadPublication: (item) => {
        started.push(item.entryId);
        return new Promise<DownloadPublicationResult>((resolve) => finishers.push(resolve));
      },
    },
    { matching: () => DEFAULT_BOOK_MATCHING, defaults: () => INITIAL_READING_DEFAULTS },
    { describeOpenFile: () => '', downloaded: () => undefined, updated: () => undefined },
  );
  const entries: QueuedDownload[] = ids.map((id, index) => ({
    publication: publication(id, unsupported.includes(id) ? { acquisition: null } : {}),
    feedPosition: index,
  }));
  const kept: ReadonlySet<string>[] = [];
  const selection = new CatalogSelection(
    downloads,
    () => entries,
    (entryIds) => kept.push(entryIds),
  );
  return { selection, downloads, started, finishers, kept, entries };
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function chosenIds(selection: CatalogSelection): string[] {
  return selection.chosen.map(({ publication: item }) => item.entryId);
}

describe('CatalogSelection', () => {
  it('toggles an entry on and off', () => {
    const { selection } = setup(['a', 'b']);
    selection.toggle('a');
    expect(selection.has('a')).toBe(true);
    selection.toggle('a');
    expect(selection.has('a')).toBe(false);
  });

  it('offers only entries that can still be downloaded', async () => {
    const { selection, downloads, entries } = setup(['a', 'b', 'c'], ['c']);
    downloads.setHeld(
      new Map([['b', { bookId: bookId('held'), updated: '2026-08-01T00:00:00Z' }]]),
    );
    expect(selection.selectable.map(({ publication: item }) => item.entryId)).toEqual(['a']);
    void downloads.start(entries[0]!.publication, 0);
    await settle();
    expect(selection.selectable).toEqual([]);
  });

  it('offers an entry whose download failed', async () => {
    const { selection, downloads, finishers, entries } = setup(['a']);
    const run = downloads.start(entries[0]!.publication, 0);
    finishers[0]?.({ kind: 'offline' });
    await run;
    expect(downloads.itemFor(entries[0]!.publication).kind).toBe('download-failed');
    expect(selection.selectable).toHaveLength(1);
  });

  it('selects every selectable entry at once', () => {
    const { selection } = setup(['a', 'b', 'c'], ['b']);
    selection.selectAll();
    expect(chosenIds(selection)).toEqual(['a', 'c']);
    expect(selection.count).toBe(2);
  });

  it('clears the selection', () => {
    const { selection } = setup(['a', 'b']);
    selection.selectAll();
    selection.clear();
    expect(selection.count).toBe(0);
  });

  it('hands every change to the session', () => {
    const { selection, kept } = setup(['a', 'b']);
    selection.toggle('a');
    selection.clear();
    expect([...(kept[0] ?? [])]).toEqual(['a']);
    expect(kept[1]?.size).toBe(0);
  });

  it('restores a saved selection', () => {
    const { selection } = setup(['a', 'b']);
    selection.restore(new Set(['b']));
    expect(chosenIds(selection)).toEqual(['b']);
  });

  it('starts the first chosen entry in feed order and no other until it ends', async () => {
    const { selection, started, finishers } = setup(['a', 'b', 'c']);
    selection.toggle('c');
    selection.toggle('a');
    const run = selection.downloadSelected();
    await settle();
    expect(started).toEqual(['a']);
    finishers[0]?.({ kind: 'offline' });
    await run;
    expect(started).toEqual(['a']);
  });

  it('continues with the next chosen entry once the first ends', async () => {
    const { selection, started, finishers } = setup(['a', 'b', 'c']);
    selection.toggle('c');
    selection.toggle('a');
    const run = selection.downloadSelected();
    await settle();
    finishers[0]?.({ kind: 'aborted' });
    await settle();
    finishers[1]?.({ kind: 'aborted' });
    await run;
    expect(started).toEqual(['a', 'c']);
  });

  it('drops an entry from the selection as its download starts', async () => {
    const { selection, finishers } = setup(['a', 'b']);
    selection.selectAll();
    const run = selection.downloadSelected();
    await settle();
    expect(selection.has('a')).toBe(false);
    expect(selection.has('b')).toBe(true);
    finishers[0]?.({ kind: 'aborted' });
    await settle();
    expect(selection.has('b')).toBe(false);
    finishers[1]?.({ kind: 'aborted' });
    await run;
  });

  it('keeps unstarted entries selected when the queue stops', async () => {
    const { selection, finishers } = setup(['a', 'b']);
    selection.selectAll();
    const run = selection.downloadSelected();
    await settle();
    finishers[0]?.({ kind: 'offline' });
    await run;
    expect(chosenIds(selection)).toEqual(['b']);
  });
});
