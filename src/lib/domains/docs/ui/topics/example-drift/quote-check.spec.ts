import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { editedQuote } from '../../../domain/quote-drift';
import {
  DEMO_QUOTES,
  EDIT_OPTIONS,
  checkSummary,
  demoQuote,
  demoSource,
  quoteCheck,
  quoteEdit,
} from './quote-check';

const JA_OCR_TEXT = demoQuote('ja-ocr-text').snippet;

function checked(editId: Parameters<typeof quoteEdit>[0]): string {
  return quoteCheck(JA_OCR_TEXT.file, editedQuote(JA_OCR_TEXT.code, quoteEdit(editId))).kind;
}

describe('the drift check demo', () => {
  it.each(DEMO_QUOTES.map((quote) => [quote.id, quote] as const))(
    'loads the same text for %s that the spec reads from disk',
    (_id, quote) => {
      expect(demoSource(quote.snippet.file)).toBe(readFileSync(quote.snippet.file, 'utf8'));
    },
  );

  it('passes the quote as quoted, reindented and flush left, and fails every other edit', () => {
    expect(EDIT_OPTIONS.map((option) => [option.id, checked(option.id)])).toEqual([
      ['as-quoted', 'found'],
      ['reindented', 'found'],
      ['flush-left', 'found'],
      ['trailing-space', 'missing'],
      ['line-left-out', 'missing'],
      ['renamed', 'missing'],
    ]);
  });

  it('renames the function every demo quote calls', () => {
    for (const quote of DEMO_QUOTES) {
      expect(
        quoteCheck(quote.snippet.file, editedQuote(quote.snippet.code, quoteEdit('renamed'))),
      ).toMatchObject({ kind: 'missing' });
    }
  });

  it('reports a file the demo did not load', () => {
    expect(quoteCheck('src/nowhere.ts', 'x')).toEqual({
      kind: 'source-missing',
      file: 'src/nowhere.ts',
    });
  });

  it('summarizes the line a found quote starts on and the line that breaks a missing one', () => {
    expect(checkSummary({ kind: 'found', line: 1 }, 'a.ts').text).toBe(
      'The quote starts on line 1 of a.ts.',
    );
    expect(checkSummary({ kind: 'missing', matchedLines: 2, firstMissing: '}' }, 'a.ts').text).toBe(
      'The first 2 lines of the quote appear in the file together. The next line breaks the match: }',
    );
    expect(
      checkSummary({ kind: 'missing', matchedLines: 0, firstMissing: 'x' }, 'a.ts').variant,
    ).toBe('danger');
    expect(checkSummary({ kind: 'missing', matchedLines: 1, firstMissing: '}' }, 'a.ts').text).toBe(
      'Only the first line of the quote is in the file. The next line breaks the match: }',
    );
    expect(checkSummary({ kind: 'empty' }, 'a.ts').variant).toBe('warning');
  });
});
