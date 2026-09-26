import { describe, expect, it } from 'vitest';
import { lineSpacingHeight, textSizePercent } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';
import { flowStyles, INK_FOR_THE_DARK_PAGE, sameInk } from './flow-styles';
import type { PageInk } from './flow-styles';

const SMALL_AND_TIGHT: ReadingSettings = {
  textSize: 'smallest',
  lineSpacing: 'tight',
  showPhoneticReadings: true,
};

const BIG_AND_LOOSE: ReadingSettings = {
  textSize: 'largest',
  lineSpacing: 'loose',
  showPhoneticReadings: true,
};

const READINGS_HIDDEN: ReadingSettings = { ...BIG_AND_LOOSE, showPhoneticReadings: false };

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

  it('paints a selection in the accent wash so it reads on the dark page', () => {
    const styles = injected(SMALL_AND_TIGHT);

    expect(styles).toContain('::selection');
    expect(styles).toMatch(/::selection\s*\{[^}]*background:\s*rgba\(79, 178, 134, 0\.35\)/u);
    expect(styles).toMatch(/::selection\s*\{[^}]*color:\s*#f2efe9/u);
  });

  it('outranks a book that colours its own selection', () => {
    const styles = injected(BIG_AND_LOOSE);
    const rule = /::selection\s*\{([^}]*)\}/u.exec(styles)?.[1] ?? '';

    expect(rule).toMatch(/background:[^;]+!important/u);
    expect(rule).toMatch(/color:[^;]+!important/u);
  });

  it('carries the selection rule on the sheet appended after the book', () => {
    const [prepended, appended] = flowStyles(SMALL_AND_TIGHT);

    expect(appended).toContain('::selection');
    expect(prepended).not.toContain('::selection');
  });

  it('answers a different sheet for every choice on the two scales', () => {
    const sheets = new Set([
      injected(SMALL_AND_TIGHT),
      injected(BIG_AND_LOOSE),
      injected({ ...SMALL_AND_TIGHT, lineSpacing: 'loose' }),
      injected({ ...BIG_AND_LOOSE, lineSpacing: 'tight' }),
    ]);

    expect(sheets.size).toBe(4);
  });

  it('takes the readings and their parentheses out of the line when they are turned off', () => {
    const rule = /(^|\})\s*rt,\s*rp\s*\{([^}]*)\}/u.exec(injected(READINGS_HIDDEN))?.[2] ?? '';

    expect(rule).toMatch(/display:\s*none/u);
  });

  it('leaves the readings in the book for a reader who has not turned them off', () => {
    expect(injected(BIG_AND_LOOSE)).not.toContain('display: none');
  });

  it('outranks a book that styles its own readings', () => {
    const rule = /(^|\})\s*rt,\s*rp\s*\{([^}]*)\}/u.exec(injected(READINGS_HIDDEN))?.[2] ?? '';

    expect(rule).toMatch(/display:[^;]+!important/u);
  });

  it('carries the hiding rule on the sheet appended after the book', () => {
    const [prepended, appended] = flowStyles(READINGS_HIDDEN);

    expect(appended).toMatch(/rt,\s*rp/u);
    expect(prepended).not.toContain('display: none');
  });

  it('keeps sizing the readings the book does print', () => {
    const [prepended] = flowStyles(BIG_AND_LOOSE);

    expect(prepended).toContain('rt {');
    expect(prepended).toContain('font-size: 0.6em');
  });

  it('answers a different sheet whether the readings are shown or hidden', () => {
    expect(injected(READINGS_HIDDEN)).not.toBe(injected(BIG_AND_LOOSE));
  });
});

describe('flowStyles with an ink', () => {
  const PAPER: PageInk = {
    scheme: 'light',
    text: 'oklch(0.22 0.012 255)',
    link: 'oklch(0.46 0.09 195)',
    selection: 'oklch(0.93 0.04 195)',
    selectionText: 'oklch(0.3 0.01 255)',
  };

  it('answers the dark page sheets when no ink is given', () => {
    expect(flowStyles(BIG_AND_LOOSE)).toEqual(flowStyles(BIG_AND_LOOSE, INK_FOR_THE_DARK_PAGE));
  });

  it('declares the scheme of the page the ink is for', () => {
    const [prepended] = flowStyles(SMALL_AND_TIGHT, PAPER);

    expect(prepended).toContain('color-scheme: light');
    expect(prepended).not.toContain('color-scheme: dark');
  });

  it('colours the body text and the links with the ink', () => {
    const [prepended, appended] = flowStyles(SMALL_AND_TIGHT, PAPER);

    expect(appended).toMatch(/body\s*\{\s*color: oklch\(0\.22 0\.012 255\);/u);
    expect(prepended).toMatch(/a:visited\s*\{\s*color: oklch\(0\.46 0\.09 195\);/u);
  });

  it('paints a selection with the ink and still outranks the book', () => {
    const rule =
      /::selection\s*\{([^}]*)\}/u.exec(flowStyles(SMALL_AND_TIGHT, PAPER)[1])?.[1] ?? '';

    expect(rule).toContain('background: oklch(0.93 0.04 195) !important');
    expect(rule).toContain('color: oklch(0.3 0.01 255) !important');
  });

  it('keeps the size, the spacing and the readings whatever the ink', () => {
    const [, appended] = flowStyles(READINGS_HIDDEN, PAPER);

    expect(appended).toContain(`font-size: ${textSizePercent('largest')}%`);
    expect(appended).toContain(`line-height: ${lineSpacingHeight('loose')}`);
    expect(appended).toMatch(/rt,\s*rp\s*\{\s*display: none !important/u);
  });
});

describe('sameInk', () => {
  const INK: PageInk = {
    scheme: 'light',
    text: 'a',
    link: 'b',
    selection: 'c',
    selectionText: 'd',
  };

  it('answers true for two inks with the same five values', () => {
    expect(sameInk(INK, { ...INK })).toBe(true);
  });

  it('answers false when any one of the five values differs', () => {
    const changed: readonly PageInk[] = [
      { ...INK, scheme: 'dark' },
      { ...INK, text: 'x' },
      { ...INK, link: 'x' },
      { ...INK, selection: 'x' },
      { ...INK, selectionText: 'x' },
    ];

    expect(changed.map((other) => sameInk(INK, other))).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
