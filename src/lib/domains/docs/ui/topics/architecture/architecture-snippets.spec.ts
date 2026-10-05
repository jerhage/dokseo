import { describe, expect, it } from 'vitest';
import { checkSnippets } from '../snippet-checks';
import * as quotes from './architecture-snippets';
import {
  ADDED_VARIANT,
  RENAME_RESULT,
  STORAGE_LINE,
  WIDENED_RESULT,
} from './architecture-snippets';

checkSnippets('the architecture page snippets', quotes.ARCHITECTURE_SNIPPETS, quotes);

describe('the widened union', () => {
  it('widens the real union by one variant above the storage line', () => {
    expect(RENAME_RESULT.code).toContain(STORAGE_LINE);
    expect(WIDENED_RESULT).toBe(
      RENAME_RESULT.code.replace(STORAGE_LINE, `${ADDED_VARIANT}\n${STORAGE_LINE}`),
    );
    expect(WIDENED_RESULT).not.toBe(RENAME_RESULT.code);
  });
});
