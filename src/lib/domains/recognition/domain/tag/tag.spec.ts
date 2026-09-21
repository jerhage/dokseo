import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { byName, namedTag, sameTagName, tagFromStored, tagName } from './tag';
import type { StoredTag, Tag } from './tag';

describe('tagName', () => {
  it('composes a decomposed name', () => {
    expect(tagName('が'.normalize('NFD'))).toBe('が');
  });

  it('composes a decomposed Korean name', () => {
    expect(tagName('한국어'.normalize('NFD'))).toBe('한국어'.normalize('NFC'));
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
  it('reads a record with no colour as the first palette colour', () => {
    const stored: StoredTag = { id: tagId('one'), name: 'sfx' };

    expect(tagFromStored(stored).colour).toBe('slate');
  });

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
  it('equates two spellings that differ only in case', () => {
    expect(sameTagName('Grammar', 'grammar')).toBe(true);
  });

  it('equates a half-width and a full-width spelling', () => {
    expect(sameTagName('ｓｆｘ', 'sfx')).toBe(true);
  });

  it('equates a decomposed and a composed spelling', () => {
    expect(sameTagName('ぱ'.normalize('NFD'), 'ぱ'.normalize('NFC'))).toBe(true);
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

  it('orders a Japanese name against a Latin one without failing', () => {
    const ordered = byName([made('sfx', 1), made('文法', 2)]);

    expect(ordered).toHaveLength(2);
  });

  it('leaves the tags it was given alone', () => {
    const tags = [made('sfx', 1), made('keigo', 2)];
    byName(tags);

    expect(tags.map((tag) => tag.name)).toEqual(['sfx', 'keigo']);
  });
});
