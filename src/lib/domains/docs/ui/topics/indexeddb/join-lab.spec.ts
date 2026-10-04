import { describe, expect, it } from 'vitest';
import type { JoinReader, JoinSeed } from '../../../domain/indexeddb-joins';
import { JoinLab } from './join-lab.svelte';
import type { JoinLabDeps } from './join-lab.svelte';

function memoryDeps(options: { readonly failing?: string } = {}) {
  let held: JoinSeed = { books: [], captures: [] };
  let seeds = 0;
  const reader: JoinReader = {
    books: () => Promise.resolve(held.books),
    captures: () => Promise.resolve(held.captures),
    capturesOf: (bookId) =>
      Promise.resolve(held.captures.filter((capture) => capture.bookId === bookId)),
    book: (id) => Promise.resolve(held.books.find((book) => book.id === id)),
  };
  let time = 0;
  const deps: JoinLabDeps = {
    seed: (seed) => {
      if (options.failing !== undefined) return Promise.reject(new Error(options.failing));
      held = seed;
      seeds += 1;
      return Promise.resolve();
    },
    reader,
    now: () => (time += 2),
  };
  return { deps, seeds: () => seeds };
}

describe('JoinLab', () => {
  it('seeds the chosen size and runs every strategy with its request count', async () => {
    const lab = new JoinLab(memoryDeps().deps);

    await lab.run();

    expect(lab.seeded).toBe(10);
    expect(lab.runs.map((run) => [run.strategy, run.requests])).toEqual([
      ['captures-per-book', 11],
      ['book-per-capture', 101],
      ['two-scans', 2],
    ]);
    expect(lab.runs.every((run) => run.books === 10 && run.captures === 100)).toBe(true);
  });

  it('rewrites the rows before every run, at the size chosen last', async () => {
    const { deps, seeds } = memoryDeps();
    const lab = new JoinLab(deps);

    await lab.run();
    lab.books = 50;
    await lab.run();

    expect(seeds()).toBe(2);
    expect(lab.seeded).toBe(50);
    expect(lab.runs[0]?.requests).toBe(51);
  });

  it('reports a failed seed and stops being busy', async () => {
    const lab = new JoinLab(memoryDeps({ failing: 'The quota was exceeded' }).deps);

    await lab.run();

    expect(lab.failure).toBe('The quota was exceeded');
    expect(lab.busy).toBe(false);
    expect(lab.runs).toEqual([]);
  });
});
