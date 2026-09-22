import { describe, expect, it } from 'vitest';
import { lineSpacingHeight, textSizePercent } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';
import { flowStyles } from './flow-styles';

const SMALL_AND_TIGHT: ReadingSettings = { textSize: 'smallest', lineSpacing: 'tight' };

const BIG_AND_LOOSE: ReadingSettings = { textSize: 'largest', lineSpacing: 'loose' };

function injected(settings: ReadingSettings): string {
  return flowStyles(settings)[1];
}

describe('flowStyles', () => {
  it('sizes the root font to the percentage the chosen size names', () => {
    expect(injected(BIG_AND_LOOSE)).toContain(`font-size: ${textSizePercent('largest')}%`);
    expect(injected(SMALL_AND_TIGHT)).toContain(`font-size: ${textSizePercent('smallest')}%`);
  });

  it('sets the line height the chosen spacing names', () => {
    expect(injected(BIG_AND_LOOSE)).toContain(`line-height: ${lineSpacingHeight('loose')}`);
    expect(injected(SMALL_AND_TIGHT)).toContain(`line-height: ${lineSpacingHeight('tight')}`);
  });

  it('outranks a book that sizes its own text', () => {
    const styles = injected(BIG_AND_LOOSE);

    expect(styles).toMatch(/font-size:[^;]+!important/u);
    expect(styles).toMatch(/line-height:[^;]+!important/u);
  });

  it('keeps the dark page readable whatever the reader chose', () => {
    const [first, second] = flowStyles(SMALL_AND_TIGHT);

    expect(first).toContain('color-scheme: dark');
    expect(second).toContain('color: #d9d6d0');
  });

  it('answers a different sheet for every choice on the two scales', () => {
    const sheets = new Set([
      injected(SMALL_AND_TIGHT),
      injected(BIG_AND_LOOSE),
      injected({ textSize: 'smallest', lineSpacing: 'loose' }),
      injected({ textSize: 'largest', lineSpacing: 'tight' }),
    ]);

    expect(sheets.size).toBe(4);
  });
});
