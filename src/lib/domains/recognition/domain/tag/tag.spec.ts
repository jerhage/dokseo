import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { byName, namedTag, sameTagName, tagFromStored, tagName } from './tag';
import type { StoredTag, Tag } from './tag';

describe('tagName', () => {
  it.each(['が', '한국어'])('composes the decomposed name %s', (name) => {
    expect(tagName(name.normalize('NFD'))).toBe(name.normalize('NFC'));
  });

  it('trims the ends and collapses a run of inner whitespace to one space', () => {
    expect(tagName('  grammar   to \t ask  ')).toBe('grammar to ask');
  });

  it('keeps free text exactly as the reader typed it otherwise', () => {
    expect(tagName('Grammar To Ask!')).toBe('Grammar To Ask!');
  });
});

describe('namedTag', () => {
  it('stores the cleaned name rather than the raw one', () => {
    const tag = namedTag(tagId('one'), '  favourite   lines ', 'clay', 7);

    expect(tag).toEqual({ id: 'one', name: 'favourite lines', colour: 'clay', createdAt: 7 });
  });
});

describe('tagFromStored', () => {
  it.each([
    { stored: { id: tagId('one'), name: 'sfx' }, colour: 'slate' },
    { stored: { id: tagId('one'), name: 'sfx', colour: 'ember' }, colour: 'slate' },
    { stored: { id: tagId('one'), name: 'sfx', colour: 'copper' }, colour: 'copper' },
  ] satisfies { stored: StoredTag; colour: string }[])(
    'reads the stored colour $stored.colour as $colour, the first palette colour unless it knows it',
    ({ stored, colour }) => {
      expect(tagFromStored(stored).colour).toBe(colour);
    },
  );

  it('dates a record with no creation time to the beginning', () => {
    const stored: StoredTag = { id: tagId('one'), name: 'sfx' };

    expect(tagFromStored(stored).createdAt).toBe(0);
  });

  it('keeps the colour and the creation time a record carries', () => {
    const stored: StoredTag = { id: tagId('one'), name: 'sfx', colour: 'plum', createdAt: 42 };

    expect(tagFromStored(stored)).toEqual({
      id: 'one',
      name: 'sfx',
      colour: 'plum',
      createdAt: 42,
    });
  });
});

describe('sameTagName', () => {
  it.each([
    ['two spellings that differ only in case', 'Grammar', 'grammar'],
    ['a half-width and a full-width spelling', 'ｓｆｘ', 'sfx'],
    ['a decomposed and a composed spelling', 'ぱ'.normalize('NFD'), 'ぱ'.normalize('NFC')],
  ])('equates %s', (_spellings, one, other) => {
    expect(sameTagName(one, other)).toBe(true);
  });

  it('ignores the whitespace a reader left around a name', () => {
    expect(sameTagName('  keigo ', 'keigo')).toBe(true);
  });

  it('separates two genuinely different names', () => {
    expect(sameTagName('keigo', 'slang')).toBe(false);
  });

  it('separates a name that merely contains the other', () => {
    expect(sameTagName('grammar', 'grammar to ask')).toBe(false);
  });
});

describe('byName', () => {
  const made = (name: string, createdAt: number): Tag =>
    namedTag(tagId(name), name, 'slate', createdAt);

  it('orders the tags by name rather than by the moment each was made', () => {
    const ordered = byName([made('sfx', 1), made('keigo', 2), made('conditional', 3)]);

    expect(ordered.map((tag) => tag.name)).toEqual(['conditional', 'keigo', 'sfx']);
  });

  it('orders two names of differing case together rather than apart', () => {
    const ordered = byName([made('Sfx', 1), made('keigo', 2), made('sage', 3)]);

    expect(ordered.map((tag) => tag.name)).toEqual(['keigo', 'sage', 'Sfx']);
  });
});
