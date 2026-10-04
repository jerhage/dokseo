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

  it.each([
    ['no row', null, 'A stored page list holds an unknown row: null'],
    ['no book id', { names: ['001.jpg'] }, 'A stored page list lacks its book id'],
    [
      'a book id that is a path',
      { id: 'a/b', names: [] },
      'A stored page list holds an unknown book id: a/b',
    ],
    ['no names', { id: 'b-1' }, 'A stored page list lacks its page names'],
    [
      'names that are not a list',
      { id: 'b-1', names: '001.jpg' },
      'A stored page list holds an unknown page names: 001.jpg',
    ],
    [
      'a name that is not text',
      { id: 'b-1', names: ['001.jpg', 2] },
      'A stored page list holds an unknown page names: 001.jpg,2',
    ],
    [
      'an empty name',
      { id: 'b-1', names: ['001.jpg', ''] },
      'A stored page list holds an unknown page names: 001.jpg,',
    ],
  ])('reports a stored list with %s as unreadable, naming the field', (_, record, cause) => {
    expect(pageListFromStored(record)).toEqual({ kind: 'unreadable', cause });
  });
});
