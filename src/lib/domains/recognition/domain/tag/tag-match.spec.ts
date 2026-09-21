import { describe, expect, it } from 'vitest';
import { match } from 'ts-pattern';
import { tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { namedTag } from './tag';
import type { Tag } from './tag';
import { tagMatches } from './tag-match';
import type { TagMatches } from './tag-match';

const GRAMMAR = namedTag(tagId('grammar'), 'grammar', 'slate', 1);

const GRAMMAR_SOLVED = namedTag(tagId('grammar-solved'), 'grammar solved', 'clay', 2);

const SFX = namedTag(tagId('sfx'), 'sfx', 'sage', 3);

const TAGS: readonly Tag[] = [GRAMMAR, GRAMMAR_SOLVED, SFX];

function counts(entries: readonly (readonly [Tag, number])[]): ReadonlyMap<TagId, number> {
  return new Map(entries.map(([tag, count]) => [tag.id, count]));
}

const COUNTS = counts([
  [GRAMMAR, 3],
  [GRAMMAR_SOLVED, 9],
  [SFX, 1],
]);

function names(matches: TagMatches): readonly string[] {
  return match(matches)
    .with({ kind: 'every' }, { kind: 'matched' }, { kind: 'matched-only' }, (found) =>
      found.options.map((option) => option.tag.name),
    )
    .with({ kind: 'create-only' }, { kind: 'taken' }, () => [])
    .exhaustive();
}

describe('tagMatches', () => {
  it('offers every tag when the query is empty', () => {
    expect(tagMatches(TAGS, COUNTS, [], '').kind).toBe('every');
  });

  it('offers every tag when the query is whitespace only', () => {
    expect(tagMatches(TAGS, COUNTS, [], '   ').kind).toBe('every');
  });

  it('orders the options by count descending', () => {
    expect(names(tagMatches(TAGS, COUNTS, [], ''))).toEqual(['grammar solved', 'grammar', 'sfx']);
  });

  it('orders two tags of equal count by name', () => {
    const equal = counts([
      [GRAMMAR, 2],
      [GRAMMAR_SOLVED, 2],
      [SFX, 2],
    ]);

    expect(names(tagMatches(TAGS, equal, [], ''))).toEqual(['grammar', 'grammar solved', 'sfx']);
  });

  it('counts a tag no capture carries as nothing', () => {
    const found = tagMatches(TAGS, new Map(), [], 'sf');

    expect(found.kind === 'matched' && found.options[0]?.count).toBe(0);
  });

  it('leaves out a tag the capture already carries', () => {
    expect(names(tagMatches(TAGS, COUNTS, [GRAMMAR.id], ''))).toEqual(['grammar solved', 'sfx']);
  });

  it('offers the matches and the new name when the query matches and is free', () => {
    const found = tagMatches(TAGS, COUNTS, [], 'gramm');

    expect(found).toEqual({
      kind: 'matched',
      options: [
        { tag: GRAMMAR_SOLVED, count: 9 },
        { tag: GRAMMAR, count: 3 },
      ],
      create: 'gramm',
    });
  });

  it('trims the name it offers to create', () => {
    const found = tagMatches(TAGS, COUNTS, [], '  gramm  ');

    expect(found.kind === 'matched' && found.create).toBe('gramm');
  });

  it('offers the matches alone when the query is an existing name', () => {
    const found = tagMatches(TAGS, COUNTS, [], 'grammar');

    expect(found).toEqual({
      kind: 'matched-only',
      options: [
        { tag: GRAMMAR_SOLVED, count: 9 },
        { tag: GRAMMAR, count: 3 },
      ],
    });
  });

  it('reads a name of a different case as the same existing name', () => {
    expect(tagMatches(TAGS, COUNTS, [], 'Grammar').kind).toBe('matched-only');
  });

  it('offers the new name alone when nothing matches', () => {
    expect(tagMatches(TAGS, COUNTS, [], 'keigo')).toEqual({ kind: 'create-only', create: 'keigo' });
  });

  it('offers nothing when the only tag of that name is one the capture carries', () => {
    expect(tagMatches(TAGS, COUNTS, [SFX.id], 'sfx')).toEqual({ kind: 'taken' });
  });

  it('matches a tag through a full-width query', () => {
    expect(tagMatches(TAGS, COUNTS, [], 'ｓｆ').kind).toBe('matched');
  });
});
