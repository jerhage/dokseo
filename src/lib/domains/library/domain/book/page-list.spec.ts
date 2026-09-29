import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { pageListFromStored } from './page-list';

describe('pageListFromStored', () => {
  it('reads a book stored before page lists as unlisted', () => {
    expect(pageListFromStored(undefined)).toEqual({ kind: 'unlisted' });
  });

  it('reads a stored list as listed, keeping its order', () => {
    const names = ['010.jpg', '.cover.jpg', '002.jpg'];

    expect(pageListFromStored({ id: bookId('b-1'), names })).toEqual({ kind: 'listed', names });
  });
});
