import { match } from 'ts-pattern';
import { quoteVerdict } from '../../../domain/quote-drift';
import type { QuoteEdit, QuoteVerdict } from '../../../domain/quote-drift';
import { DECODE_LOOP } from '../ocr/ocr-snippets';
import type { SourceSnippet } from '../ocr/ocr-snippets';
import { OCR_TEXT } from '../unicode/unicode-snippets';

type DemoQuoteId = 'ja-ocr-text' | 'decode-loop';

type DemoQuote = {
  readonly id: DemoQuoteId;
  readonly title: string;
  readonly snippet: SourceSnippet;
};

type EditId = QuoteEdit['kind'];

type EditOption = {
  readonly id: EditId;
  readonly label: string;
};

type QuoteCheck = QuoteVerdict | { readonly kind: 'source-missing'; readonly file: string };

type CheckSummary = {
  readonly variant: 'success' | 'danger' | 'warning';
  readonly title: string;
  readonly text: string;
};

const RENAMED_FUNCTION = { from: 'jaOcrText', to: 'japaneseOcrText' } as const;

const DEMO_QUOTES: readonly DemoQuote[] = [
  { id: 'ja-ocr-text', title: 'jaOcrText (Unicode page)', snippet: OCR_TEXT },
  { id: 'decode-loop', title: 'The decode loop (OCR page)', snippet: DECODE_LOOP },
];

const EDIT_OPTIONS: readonly EditOption[] = [
  { id: 'as-quoted', label: 'As quoted' },
  { id: 'reindented', label: 'Four more spaces on every line' },
  { id: 'flush-left', label: 'Flush left' },
  { id: 'trailing-space', label: 'A space after line 1' },
  { id: 'line-left-out', label: 'The middle line left out' },
  { id: 'renamed', label: 'Before the rename' },
];

const DEMO_SOURCES = import.meta.glob<string>(
  ['/src/workers/ja-ocr-text.ts', '/src/workers/ocr.worker.ts'],
  { query: '?raw', import: 'default', eager: true },
);

function demoQuote(id: DemoQuoteId): DemoQuote {
  const found = DEMO_QUOTES.find((quote) => quote.id === id);
  if (found === undefined) throw new Error(`No demo quote is named ${id}`);
  return found;
}

function quoteEdit(id: EditId): QuoteEdit {
  return id === 'renamed' ? { kind: 'renamed', ...RENAMED_FUNCTION } : { kind: id };
}

function demoSource(file: string): string | undefined {
  return DEMO_SOURCES[`/${file}`];
}

function quoteCheck(file: string, quote: string): QuoteCheck {
  const source = demoSource(file);
  if (source === undefined) return { kind: 'source-missing', file };
  return quoteVerdict(source, quote);
}

function matchedStart(count: number): string {
  return count === 1
    ? 'Only the first line of the quote is in the file.'
    : `The first ${count} lines of the quote appear in the file together.`;
}

function checkSummary(check: QuoteCheck, file: string): CheckSummary {
  return match(check)
    .with({ kind: 'found' }, ({ line }): CheckSummary => ({
      variant: 'success',
      title: 'Found: the spec passes',
      text: `The quote starts on line ${line} of ${file}.`,
    }))
    .with({ kind: 'missing', matchedLines: 0 }, ({ firstMissing }): CheckSummary => ({
      variant: 'danger',
      title: 'Not found: the spec fails',
      text: `The first line of the quote is not in the file: ${firstMissing}`,
    }))
    .with({ kind: 'missing' }, ({ matchedLines, firstMissing }): CheckSummary => ({
      variant: 'danger',
      title: 'Not found: the spec fails',
      text: `${matchedStart(matchedLines)} The next line breaks the match: ${firstMissing}`,
    }))
    .with({ kind: 'empty' }, (): CheckSummary => ({
      variant: 'warning',
      title: 'Blank: the spec passes and checks nothing',
      text: 'A quote of only spaces and line breaks matches almost any file, so the check proves nothing.',
    }))
    .with({ kind: 'source-missing' }, ({ file: missing }): CheckSummary => ({
      variant: 'danger',
      title: 'File not loaded',
      text: `${missing} is not among the files this demo loads.`,
    }))
    .exhaustive();
}

export { DEMO_QUOTES, EDIT_OPTIONS, checkSummary, demoQuote, demoSource, quoteCheck, quoteEdit };
export type { CheckSummary, DemoQuote, DemoQuoteId, EditId, EditOption, QuoteCheck };
