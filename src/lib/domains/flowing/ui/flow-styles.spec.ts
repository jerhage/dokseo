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
  const EVERY_SCALE: readonly ReadingSettings[] = [
    SMALL_AND_TIGHT,
    BIG_AND_LOOSE,
    { ...SMALL_AND_TIGHT, lineSpacing: 'loose' },
    { ...BIG_AND_LOOSE, lineSpacing: 'tight' },
  ];

  it.each(EVERY_SCALE)(
    'sizes the root font to the percentage $textSize names, outranking the book',
    (settings) => {
      expect(injected(settings)).toContain(
        `font-size: ${textSizePercent(settings.textSize)}% !important`,
      );
    },
  );

  it.each(EVERY_SCALE)(
    'sets the line height $lineSpacing names, outranking the book',
    (settings) => {
      expect(injected(settings)).toContain(
        `line-height: ${lineSpacingHeight(settings.lineSpacing)} !important`,
      );
    },
  );

  it.each(['vertical-rl', 'vertical-lr'] as const)(
    "lays every chapter of a %s book out in the book's writing mode",
    (mode) => {
      const [prepended, appended] = flowStyles(SMALL_AND_TIGHT, INK_FOR_THE_DARK_PAGE, mode);

      expect(prepended).not.toContain('writing-mode');
      expect(appended).toMatch(
        new RegExp(`html, body \\{\\s*writing-mode: ${mode} !important;`, 'u'),
      );
    },
  );

  it('leaves the writing mode of a horizontal book to the book', () => {
    const styles = flowStyles(SMALL_AND_TIGHT, INK_FOR_THE_DARK_PAGE, 'horizontal');

    expect(styles.join('')).not.toContain('writing-mode');
    expect(styles).toEqual(flowStyles(SMALL_AND_TIGHT));
  });

  it('keeps the dark page readable whatever the reader chose', () => {
    const [first, second] = flowStyles(SMALL_AND_TIGHT);

    expect(first).toContain('color-scheme: dark');
    expect(second).toContain('color: #d9d6d0');
  });

  it('paints a selection in the accent wash so it reads on the dark page', () => {
    const styles = injected(SMALL_AND_TIGHT);

    expect(styles).toContain('::selection');
    expect(styles).toMatch(
      /::selection\s*\{[^}]*background:\s*rgba\(79, 178, 134, 0\.35\) !important/u,
    );
    expect(styles).toMatch(/::selection\s*\{[^}]*color:\s*#f2efe9 !important/u);
  });

  it('carries the selection rule on the sheet appended after the book', () => {
    const [prepended, appended] = flowStyles(SMALL_AND_TIGHT);

    expect(appended).toContain('::selection');
    expect(prepended).not.toContain('::selection');
  });

  it('takes the readings and their parentheses out of the line when they are turned off, outranking the book from the sheet appended after it', () => {
    const [prepended, appended] = flowStyles(READINGS_HIDDEN);
    const rule = /(^|\})\s*rt,\s*rp\s*\{([^}]*)\}/u.exec(appended)?.[2] ?? '';

    expect(rule).toMatch(/display:\s*none !important/u);
    expect(prepended).not.toContain('display: none');
  });

  it('leaves the readings in the book for a reader who has not turned them off', () => {
    expect(injected(BIG_AND_LOOSE)).not.toContain('display: none');
  });

  it('keeps sizing the readings the book does print', () => {
    const [prepended] = flowStyles(BIG_AND_LOOSE);

    expect(prepended).toContain('rt {');
    expect(prepended).toContain('font-size: 0.6em');
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
