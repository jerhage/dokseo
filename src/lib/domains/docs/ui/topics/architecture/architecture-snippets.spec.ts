import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ADDED_VARIANT,
  ARCHITECTURE_SNIPPETS,
  RENAME_RESULT,
  STORAGE_LINE,
  WIDENED_RESULT,
} from './architecture-snippets';

function unindented(code: string): string {
  return code
    .split('\n')
    .map((line) => line.trimStart())
    .join('\n');
}

describe('the architecture page snippets', () => {
  it.each(ARCHITECTURE_SNIPPETS.map((snippet) => [snippet.label, snippet] as const))(
    'quotes %s exactly as the source file has it',
    (_label, snippet) => {
      const source = readFileSync(snippet.file, 'utf8');

      expect(unindented(source)).toContain(unindented(snippet.code));
    },
  );

  it('widens the real union by one variant above the storage line', () => {
    expect(RENAME_RESULT.code).toContain(STORAGE_LINE);
    expect(WIDENED_RESULT).toBe(
      RENAME_RESULT.code.replace(STORAGE_LINE, `${ADDED_VARIANT}\n${STORAGE_LINE}`),
    );
    expect(WIDENED_RESULT).not.toBe(RENAME_RESULT.code);
  });
});
