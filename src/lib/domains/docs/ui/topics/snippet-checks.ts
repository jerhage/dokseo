import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { unindented } from '../../domain/quote-drift';
import type { SourceSnippet } from './ocr/ocr-snippets';

type SnippetModule = Readonly<Record<string, unknown>>;

function isSourceSnippet(value: unknown): value is SourceSnippet {
  return (
    typeof value === 'object' &&
    value !== null &&
    'label' in value &&
    typeof value.label === 'string' &&
    'file' in value &&
    typeof value.file === 'string' &&
    'code' in value &&
    typeof value.code === 'string'
  );
}

function exportedSnippets(module: SnippetModule): readonly SourceSnippet[] {
  return Object.values(module).flatMap((value) => {
    if (Array.isArray(value)) return value.filter(isSourceSnippet);
    return isSourceSnippet(value) ? [value] : [];
  });
}

function unlistedSnippets(module: SnippetModule, snippets: readonly SourceSnippet[]): string[] {
  return exportedSnippets(module)
    .filter((snippet) => !snippets.includes(snippet))
    .map((snippet) => snippet.label);
}

function checkSnippets(
  title: string,
  snippets: readonly SourceSnippet[],
  module: SnippetModule,
): void {
  describe(title, () => {
    it.each(snippets.map((snippet) => [snippet.label, snippet] as const))(
      'quotes %s exactly as the source file has it',
      (_label, snippet) => {
        const source = readFileSync(snippet.file, 'utf8');

        expect(unindented(source)).toContain(unindented(snippet.code));
      },
    );

    it('lists every quote its module exports', () => {
      expect(unlistedSnippets(module, snippets)).toEqual([]);
    });
  });
}

export { checkSnippets, exportedSnippets, unlistedSnippets };
export type { SnippetModule };
