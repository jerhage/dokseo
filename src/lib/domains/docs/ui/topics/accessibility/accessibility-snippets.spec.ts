import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACCESSIBILITY_SNIPPETS } from './accessibility-snippets';

function unindented(code: string): string {
  return code
    .split('\n')
    .map((line) => line.trimStart())
    .join('\n');
}

describe('the accessibility page snippets', () => {
  it.each(ACCESSIBILITY_SNIPPETS.map((snippet) => [snippet.label, snippet] as const))(
    'quotes %s exactly as the source file has it',
    (_label, snippet) => {
      const source = readFileSync(snippet.file, 'utf8');

      expect(unindented(source)).toContain(unindented(snippet.code));
    },
  );
});
