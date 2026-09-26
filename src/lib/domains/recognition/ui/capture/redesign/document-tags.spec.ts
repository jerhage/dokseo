import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import type { Tag } from '../../../domain/tag/tag';
import { tagsInUse } from './document-tags';

const VERB: Tag = {
  id: tagId('t1'),
  name: 'verb',
  colour: 'rose',
  createdAt: 1,
};
const KANJI: Tag = {
  id: tagId('t2'),
  name: 'kanji',
  colour: 'sky',
  createdAt: 2,
};
const IDIOM: Tag = {
  id: tagId('t3'),
  name: 'idiom',
  colour: 'fern',
  createdAt: 3,
};

describe('tagsInUse', () => {
  it('lists only the tags this book uses, with their colour and count', () => {
    const counts = new Map([
      [VERB.id, 2],
      [IDIOM.id, 0],
    ]);

    expect(tagsInUse([VERB, KANJI, IDIOM], counts)).toEqual([
      { id: VERB.id, name: 'verb', colour: 'rose', count: 2 },
    ]);
  });

  it('orders the most used first and breaks a tie by name', () => {
    const counts = new Map([
      [VERB.id, 1],
      [KANJI.id, 3],
      [IDIOM.id, 1],
    ]);

    expect(tagsInUse([VERB, KANJI, IDIOM], counts).map((tag) => tag.name)).toEqual([
      'kanji',
      'idiom',
      'verb',
    ]);
  });
});
