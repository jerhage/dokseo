import { match } from 'ts-pattern';

type QuoteEdit =
  | { readonly kind: 'as-quoted' }
  | { readonly kind: 'reindented' }
  | { readonly kind: 'flush-left' }
  | { readonly kind: 'trailing-space' }
  | { readonly kind: 'line-left-out' }
  | { readonly kind: 'renamed'; readonly from: string; readonly to: string };

type QuoteVerdict =
  | { readonly kind: 'empty' }
  | { readonly kind: 'found'; readonly line: number }
  | { readonly kind: 'missing'; readonly matchedLines: number; readonly firstMissing: string };

const EXTRA_INDENT = '    ';

function unindented(code: string): string {
  return code
    .split('\n')
    .map((line) => line.trimStart())
    .join('\n');
}

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

function matchedPrefix(source: string, lines: readonly string[]): number {
  for (let count = lines.length; count > 0; count -= 1) {
    if (source.includes(lines.slice(0, count).join('\n'))) return count;
  }
  return 0;
}

function quoteVerdict(source: string, quote: string): QuoteVerdict {
  if (quote.trim() === '') return { kind: 'empty' };
  const flatSource = unindented(source);
  const flatQuote = unindented(quote);
  const index = flatSource.indexOf(flatQuote);
  if (index !== -1) return { kind: 'found', line: lineAt(flatSource, index) };
  const lines = flatQuote.split('\n');
  const matchedLines = matchedPrefix(flatSource, lines);
  return { kind: 'missing', matchedLines, firstMissing: lines[matchedLines] ?? '' };
}

function editedQuote(code: string, edit: QuoteEdit): string {
  const lines = code.split('\n');
  return match(edit)
    .with({ kind: 'as-quoted' }, () => code)
    .with({ kind: 'reindented' }, () => lines.map((line) => `${EXTRA_INDENT}${line}`).join('\n'))
    .with({ kind: 'flush-left' }, () => unindented(code))
    .with({ kind: 'trailing-space' }, () =>
      lines.map((line, index) => (index === 0 ? `${line} ` : line)).join('\n'),
    )
    .with({ kind: 'line-left-out' }, () =>
      lines.filter((_line, index) => index !== Math.floor(lines.length / 2)).join('\n'),
    )
    .with({ kind: 'renamed' }, ({ from, to }) => code.replace(from, to))
    .exhaustive();
}

export { editedQuote, quoteVerdict, unindented };
export type { QuoteEdit, QuoteVerdict };
