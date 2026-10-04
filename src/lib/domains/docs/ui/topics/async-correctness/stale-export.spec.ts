import { describe, expect, it } from 'vitest';
import { BookCapturesExport } from '$lib/shared/book-captures-export.svelte';
import { bookId } from '$lib/shared/ids';
import { exportStateText, rehearsedExporting } from './stale-export';
import type { ExportLogEntry, RehearsalBook } from './stale-export';

const HARBOR: RehearsalBook = {
  id: bookId('harbor'),
  title: 'Harbor Lights',
  captures: 3,
  delayMs: 900,
};

const FERRY: RehearsalBook = {
  id: bookId('ferry'),
  title: 'Night Ferry',
  captures: 5,
  delayMs: 200,
};

function harness(books: readonly RehearsalBook[]) {
  const releases = new Map<number, () => void>();
  const log: ExportLogEntry[] = [];
  const view = new BookCapturesExport(
    rehearsedExporting(
      books,
      (ms) =>
        new Promise((resolve) => {
          releases.set(ms, resolve);
        }),
      (entry) => log.push(entry),
    ),
  );
  return { view, releases, log };
}

describe('the stale export rehearsal', () => {
  it('keeps the later book when the earlier book answers last', async () => {
    const world = harness([HARBOR, FERRY]);
    const first = world.view.prepare(HARBOR.id);
    const second = world.view.prepare(FERRY.id);
    await Promise.resolve();
    world.releases.get(FERRY.delayMs)?.();
    await second;
    world.releases.get(HARBOR.delayMs)?.();
    await first;

    expect(exportStateText(world.view.state, [HARBOR, FERRY])).toBe(
      'ready: Night Ferry, 5 captures',
    );
    expect(world.log.map((entry) => `${entry.kind} ${entry.title}`)).toEqual([
      'asked Harbor Lights',
      'asked Night Ferry',
      'answered Night Ferry',
      'answered Harbor Lights',
    ]);
  });

  it('describes a state that holds no file', () => {
    const world = harness([HARBOR]);

    expect(exportStateText(world.view.state, [HARBOR])).toBe('unprepared');
  });

  it('answers nothing to export for a book it does not hold', async () => {
    const world = harness([HARBOR]);
    await world.view.prepare(FERRY.id);

    expect(exportStateText(world.view.state, [HARBOR])).toBe('nothing to export');
  });
});
