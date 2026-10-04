import { describe, expect, it } from 'vitest';
import { JOIN_STRATEGIES, expectedRequests, joinSeed, joinWith } from './indexeddb-joins';
import type { JoinReader, JoinSeed } from './indexeddb-joins';

function memoryReader(seed: JoinSeed): JoinReader {
  return {
    books: () => Promise.resolve(seed.books),
    captures: () => Promise.resolve(seed.captures),
    capturesOf: (bookId) =>
      Promise.resolve(seed.captures.filter((capture) => capture.bookId === bookId)),
    book: (id) => Promise.resolve(seed.books.find((book) => book.id === id)),
  };
}

describe('joinWith', () => {
  const seed = joinSeed(4, 3);

  it('returns the same books and pages from every strategy', async () => {
    const outcomes = await Promise.all(
      JOIN_STRATEGIES.map((strategy) => joinWith(strategy, memoryReader(seed))),
    );

    const [first, ...rest] = outcomes.map((outcome) => outcome.books);
    for (const books of rest) expect(books).toEqual(first);
    expect(first?.[0]).toEqual({ bookId: 'book-001', title: 'Volume 1', pages: [1, 2, 3] });
  });

  it.each(JOIN_STRATEGIES)('counts the requests %s makes as its formula predicts', async (s) => {
    const outcome = await joinWith(s, memoryReader(seed));

    expect(outcome.requests).toBe(expectedRequests(s, 4, 12));
  });

  it('counts 1 + N for one lookup per book and 2 for two scans', () => {
    expect(expectedRequests('captures-per-book', 20, 200)).toBe(21);
    expect(expectedRequests('book-per-capture', 20, 200)).toBe(201);
    expect(expectedRequests('two-scans', 20, 200)).toBe(2);
  });

  it('leaves out a book that holds no capture', async () => {
    const lonely: JoinSeed = {
      books: [...seed.books, { id: 'book-999', title: 'Empty' }],
      captures: seed.captures,
    };

    for (const strategy of JOIN_STRATEGIES) {
      const outcome = await joinWith(strategy, memoryReader(lonely));
      expect(outcome.books.map((book) => book.bookId)).not.toContain('book-999');
    }
  });
});

describe('joinSeed', () => {
  it('spreads the captures evenly over the books with numbered ids', () => {
    const seed = joinSeed(3, 2);

    expect(seed.books.map((book) => book.id)).toEqual(['book-001', 'book-002', 'book-003']);
    expect(seed.captures.map((capture) => capture.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(seed.captures.filter((capture) => capture.bookId === 'book-002')).toHaveLength(2);
  });
});
