import { describe, expect, it } from 'vitest';
import { CorruptRow } from '$lib/shared/corrupt-row';
import { tagId } from '$lib/shared/ids';
import { byName, namedTag, sameTagName, tagFromStored, tagName, tagsFromStored } from './tag';
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
    { stored: { id: tagId('one'), name: 'sfx', createdAt: 1 }, colour: undefined },
    { stored: { id: tagId('one'), name: 'sfx', colour: 'ember', createdAt: 1 }, colour: 'ember' },
  ] satisfies { stored: StoredTag; colour: string | undefined }[])(
    'rejects the stored colour $colour rather than reading a fallback',
    ({ stored }) => {
      expect(() => tagFromStored(stored)).toThrow(CorruptRow);
      expect(() => tagFromStored(stored)).toThrow(
        /A stored tag (lacks its|holds an unknown) colour/u,
      );
    },
  );

  it('keeps the colour and the creation time a record carries', () => {
    const stored: StoredTag = { id: tagId('one'), name: 'sfx', colour: 'plum', createdAt: 42 };

    expect(tagFromStored(stored)).toEqual({
      id: 'one',
      name: 'sfx',
      colour: 'plum',
      createdAt: 42,
    });
  });

  it.each([
    ['id', { name: 'sfx', createdAt: 1 }, 'A stored tag lacks its id'],
    ['id', { id: 7, name: 'sfx', createdAt: 1 }, 'A stored tag holds an unknown id: 7'],
    ['name', { id: 'one', createdAt: 1 }, 'A stored tag lacks its name'],
    ['name', { id: 'one', name: 3, createdAt: 1 }, 'A stored tag holds an unknown name: 3'],
    [
      'id',
      { id: '', name: 'sfx', colour: 'plum', createdAt: 1 },
      'A stored tag holds an unknown id: ',
    ],
    [
      'name',
      { id: 'one', name: '', colour: 'plum', createdAt: 1 },
      'A stored tag holds an unknown name: ',
    ],
    [
      'name',
      { id: 'one', name: ' \t ', colour: 'plum', createdAt: 1 },
      'A stored tag holds an unknown name:',
    ],
    [
      'creation time',
      { id: 'one', name: 'sfx', colour: 'plum' },
      'A stored tag lacks its created time',
    ],
    [
      'creation time',
      { id: 'one', name: 'sfx', colour: 'plum', createdAt: '1' },
      'A stored tag holds an unknown created time: 1',
    ],
    [
      'creation time',
      { id: 'one', name: 'sfx', colour: 'plum', createdAt: Number.NaN },
      'A stored tag holds an unknown created time: NaN',
    ],
  ] satisfies [string, StoredTag, string][])(
    'rejects a row whose %s is missing, empty or of the wrong type',
    (_field, stored, message) => {
      expect(() => tagFromStored(stored)).toThrow(CorruptRow);
      expect(() => tagFromStored(stored)).toThrow(message);
    },
  );
});

describe('tagsFromStored', () => {
  it('keeps the rows that read and lists the rest apart by id, any stored name and the stored row', () => {
    const rows: StoredTag[] = [
      { id: 'good', name: 'sfx', colour: 'plum', createdAt: 1 },
      { id: 'nameless', colour: 'plum', createdAt: 2 },
      { id: 'undated', name: 'keigo' },
    ];

    expect(tagsFromStored(rows)).toEqual({
      tags: [{ id: 'good', name: 'sfx', colour: 'plum', createdAt: 1 }],
      unreadable: [
        { id: 'nameless', name: null, stored: rows[1] },
        { id: 'undated', name: 'keigo', stored: rows[2] },
      ],
    });
  });

  it.each([
    { name: 'sfx', createdAt: 1 },
    { id: 5, name: 'sfx', createdAt: 1 },
  ] satisfies StoredTag[])(
    'rethrows for a row %j with no usable id, which nothing could remove',
    (row) => {
      expect(() => tagsFromStored([row])).toThrow(CorruptRow);
    },
  );
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
