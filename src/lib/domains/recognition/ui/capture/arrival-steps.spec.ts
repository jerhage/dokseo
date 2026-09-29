import { describe, expect, it } from 'vitest';
import { bookId, imageIndex } from '$lib/shared/ids';
import { arrivalSteps } from './arrival-steps';

const BOOK = bookId('book-1');

const STEPPING = {
  ordinal: 2,
  total: 5,
  previous: imageIndex(1),
  next: imageIndex(7),
};

describe('arrivalSteps', () => {
  it('names the match counted from one out of the total', () => {
    expect(arrivalSteps(BOOK, 'ねこ', STEPPING).count).toBe('match 2 of 5');
  });

  it('links each neighbour to its image with the query carried and no capture id', () => {
    const steps = arrivalSteps(BOOK, 'ねこ', STEPPING);

    expect(steps.previous).toBe('/read/book-1?image=1&find=%E3%81%AD%E3%81%93');
    expect(steps.next).toBe('/read/book-1?image=7&find=%E3%81%AD%E3%81%93');
  });
});
