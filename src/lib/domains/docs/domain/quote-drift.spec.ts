import { describe, expect, it } from 'vitest';
import { editedQuote, quoteVerdict, unindented } from './quote-drift';
import type { QuoteEdit } from './quote-drift';

const SOURCE = `class Plan {
  run() {
    const total = 1;
    return total;
  }
}
`;

const QUOTE = `run() {
  const total = 1;
  return total;
}`;

describe('unindented', () => {
  it('removes the leading whitespace of every line and keeps the rest', () => {
    expect(unindented('  a \n\tb\n\n    c')).toBe('a \nb\n\nc');
  });
});

describe('quoteVerdict', () => {
  it('finds a quote at the line where it starts, whatever its indentation', () => {
    expect(quoteVerdict(SOURCE, QUOTE)).toEqual({ kind: 'found', line: 2 });
  });

  it('finds a quote that starts in the middle of a line', () => {
    expect(quoteVerdict(SOURCE, 'total = 1;')).toEqual({ kind: 'found', line: 3 });
  });

  it('reports how many lines matched and the first line that did not', () => {
    expect(quoteVerdict(SOURCE, QUOTE.replace('return total', 'return sum'))).toEqual({
      kind: 'missing',
      matchedLines: 2,
      firstMissing: 'return sum;',
    });
  });

  it('reports no matched line when the first line is not in the source', () => {
    expect(quoteVerdict(SOURCE, 'walk() {')).toEqual({
      kind: 'missing',
      matchedLines: 0,
      firstMissing: 'walk() {',
    });
  });

  it('reports an empty quote', () => {
    expect(quoteVerdict(SOURCE, ' \n ')).toEqual({ kind: 'empty' });
  });
});

describe('editedQuote', () => {
  it('passes a reindented and a flush-left quote, and fails the other edits', () => {
    const edits: readonly QuoteEdit[] = [
      { kind: 'as-quoted' },
      { kind: 'reindented' },
      { kind: 'flush-left' },
      { kind: 'trailing-space' },
      { kind: 'line-left-out' },
      { kind: 'renamed', from: 'total', to: 'sum' },
    ];
    const verdicts = edits.map((edit) => quoteVerdict(SOURCE, editedQuote(QUOTE, edit)).kind);

    expect(verdicts).toEqual(['found', 'found', 'found', 'missing', 'missing', 'missing']);
  });

  it('leaves out the middle line and renames only the first occurrence', () => {
    expect(editedQuote('a\nb\nc', { kind: 'line-left-out' })).toBe('a\nc');
    expect(editedQuote('x x', { kind: 'renamed', from: 'x', to: 'y' })).toBe('y x');
  });
});
