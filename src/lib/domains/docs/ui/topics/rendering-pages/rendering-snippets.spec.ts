import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RENDERING_SNIPPETS } from './rendering-snippets';

function unindented(code: string): string {
  return code
    .split('\n')
    .map((line) => line.trimStart())
    .join('\n');
}

describe('the rendering pages snippets', () => {
  it.each(RENDERING_SNIPPETS.map((snippet) => [snippet.label, snippet] as const))(
    'quotes %s exactly as the source file has it',
    (_label, snippet) => {
      const source = readFileSync(snippet.file, 'utf8');

      expect(unindented(source)).toContain(unindented(snippet.code));
    },
  );
});
