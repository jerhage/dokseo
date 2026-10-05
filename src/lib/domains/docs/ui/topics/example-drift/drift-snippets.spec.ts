import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { unindented } from '../../../domain/quote-drift';
import { DECODE_LOOP } from '../ocr/ocr-snippets';
import { checkSnippets } from '../snippet-checks';
import { DRIFT_SECTIONS } from './drift-sections';
import * as quotes from './drift-snippets';
import {
  DECODE_LOOP_BEFORE,
  FILE_BEFORE,
  MOVED_FILE_REPORT,
  QUOTED_LINE_BEFORE,
  QUOTED_LINE_NOW,
  RENAME_REPORT_CHANGE,
  RENAME_REPORT_HEAD,
} from './recorded-failures';

function thrownMessage(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return '';
}

checkSnippets('the example drift page snippets', quotes.DRIFT_SNIPPETS, quotes);

describe('the recorded failures', () => {
  it('rebuilds the quote from before the rename by changing one line of today’s quote', () => {
    expect(DECODE_LOOP.code).toContain(QUOTED_LINE_NOW);
    expect(DECODE_LOOP_BEFORE).not.toBe(DECODE_LOOP.code);
    expect(DECODE_LOOP_BEFORE).toContain(QUOTED_LINE_BEFORE);
  });

  it('records the assertion message the check throws today for the quote from before the rename', () => {
    const source = readFileSync(DECODE_LOOP.file, 'utf8');
    const message = thrownMessage(() =>
      expect(unindented(source)).toContain(unindented(DECODE_LOOP_BEFORE)),
    );

    expect(message).not.toBe('');
    expect(RENAME_REPORT_HEAD).toContain(`AssertionError: ${message}`);
    expect(RENAME_REPORT_HEAD).toContain(`quotes ${DECODE_LOOP.label} exactly`);
  });

  it('records the changed line as the two sides of the diff', () => {
    expect(unindented(readFileSync(DECODE_LOOP.file, 'utf8'))).toContain(`\n${QUOTED_LINE_NOW}\n`);
    expect(RENAME_REPORT_CHANGE).toContain(`- ${QUOTED_LINE_BEFORE}\n+ ${QUOTED_LINE_NOW}`);
  });

  it('records the error reading the quoted file throws once the file has moved', () => {
    const message = thrownMessage(() => readFileSync(FILE_BEFORE, 'utf8'));

    expect(message).toBe(`ENOENT: no such file or directory, open '${FILE_BEFORE}'`);
    expect(MOVED_FILE_REPORT).toContain(`Error: ${message}`);
  });
});

describe('the example drift page sections', () => {
  it('titles every section differently', () => {
    const titles = Object.values(DRIFT_SECTIONS);

    expect(new Set(titles).size).toBe(titles.length);
  });
});
