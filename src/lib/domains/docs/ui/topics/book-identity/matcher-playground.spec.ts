import { describe, expect, it } from 'vitest';
import {
  MatcherPlayground,
  UPLOAD_PRESETS,
  outcomeMarks,
  verdictOf,
} from './matcher-playground.svelte';

function preset(label: string) {
  const found = UPLOAD_PRESETS.find((candidate) => candidate.label === label);
  if (found === undefined) throw new Error(`No preset ${label}`);
  return found;
}

function outcomeOf(label: string, matching: 'content' | 'file-name' = 'content') {
  const playground = new MatcherPlayground();
  playground.usePreset(preset(label));
  playground.matching = matching;
  const outcome = playground.outcome;
  return {
    kind: outcome.kind,
    holding: outcome.kind === 'added' ? null : outcome.holding.id,
    detail:
      outcome.kind === 'restored'
        ? outcome.step
        : outcome.kind === 'already-held'
          ? `${outcome.join} merging ${outcome.merged.map((row) => row.id).join(',')}`
          : null,
  };
}

describe('MatcherPlayground', () => {
  it.each([
    ['Yotsuba 01.cbz again', 'content', 'already-held', 'book-1', 'by-content merging book-3'],
    ['Yotsuba 01.cbz, re-zipped', 'content', 'restored', 'book-3', 'title'],
    ['Yotsuba 01.cbz, re-zipped', 'file-name', 'already-held', 'book-1', 'by-name merging book-3'],
    ['Akira, renamed', 'content', 'restored', 'book-2', 'content'],
    ['Akira, another scan', 'content', 'restored', 'book-2', 'file-name'],
    ['Akira, new scan and name', 'content', 'restored', 'book-2', 'title'],
    ['A book never seen', 'content', 'added', null, null],
  ] as const)('answers %s, matching by %s, with %s', (label, matching, kind, holding, detail) => {
    expect(outcomeOf(label, matching)).toEqual({ kind, holding, detail });
  });

  it('names the restored row, its step and the id the new book takes', () => {
    const playground = new MatcherPlayground();
    playground.usePreset(preset('Akira, another scan'));

    expect(verdictOf(playground.outcome)).toEqual({
      variant: 'success',
      title: 'Restored: Akira Vol. 1',
      body: 'No shelf book matched. This removed record matched at step 2, the same file name. The new book takes its id, book-2, so its captures attach again.',
    });
  });

  it('marks the joined book and every merged row', () => {
    const playground = new MatcherPlayground();

    expect(outcomeMarks(playground.outcome)).toEqual(
      new Map([
        ['book-1', 'joined'],
        ['book-3', 'merged'],
      ]),
    );
    expect(verdictOf(playground.outcome).body).toBe(
      'Its hash equals the hash of this shelf book. Nothing new is stored. Merged into it: Yotsuba 01. Their captures move onto the shelf book.',
    );
  });

  it('marks nothing for an added book', () => {
    const playground = new MatcherPlayground();
    playground.usePreset(preset('A book never seen'));

    expect(outcomeMarks(playground.outcome).size).toBe(0);
  });

  it('ranks a later row as more recently added', () => {
    const playground = new MatcherPlayground();

    expect(playground.ranked.map((holding) => holding.addedAt)).toEqual([1, 2, 3, 4]);
  });

  it('adds an empty row with a fresh id and removes a row by id', () => {
    const playground = new MatcherPlayground();
    playground.addHolding('removed');
    playground.removeHolding('book-1');

    expect(playground.holdings.map((holding) => holding.id)).toEqual([
      'book-2',
      'book-3',
      'book-4',
      'book-5',
    ]);
    expect(playground.holdings.at(-1)).toMatchObject({ kind: 'removed', title: '' });
  });
});
