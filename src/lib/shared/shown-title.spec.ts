import { describe, expect, it } from 'vitest';
import { aliasFor, shownTitle } from './shown-title';

describe('shownTitle', () => {
  it('shows the alias of a renamed book', () => {
    expect(shownTitle({ title: 'Yotsuba&! 1', alias: 'Mine' })).toBe('Mine');
  });

  it('shows the original title of a book with no alias', () => {
    expect(shownTitle({ title: 'Yotsuba&! 1', alias: null })).toBe('Yotsuba&! 1');
  });
});

describe('aliasFor', () => {
  it('trims a typed name into the alias', () => {
    expect(aliasFor('Yotsuba&! 1', '  Mine \n')).toBe('Mine');
  });

  it.each([
    ['an empty name', ''],
    ['a blank name', '   '],
    ['the original title', ' Yotsuba&! 1 '],
  ])('answers no alias for %s', (_, typed) => {
    expect(aliasFor('Yotsuba&! 1', typed)).toBeNull();
  });
});
