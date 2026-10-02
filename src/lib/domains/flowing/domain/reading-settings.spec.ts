import { describe, expect, it } from 'vitest';
import {
  DEFAULT_READING_SETTINGS,
  LINE_SPACING_CHOICES,
  lineSpacingHeight,
  lineSpacingOf,
  ONE_READER,
  phoneticReadingsOf,
  readingSettingsOf,
  storedReadingSettings,
  TEXT_SIZE_CHOICES,
  textSizeOf,
  textSizePercent,
  withLineSpacing,
  withPhoneticReadings,
  withTextSize,
} from './reading-settings';
import type { LineSpacing, TextSize } from './reading-settings';

const LARGER: TextSize = 'large';

const LOOSER: LineSpacing = 'relaxed';

describe('textSizePercent', () => {
  it('scales the root font size upward across the whole named set', () => {
    const percents = TEXT_SIZE_CHOICES.map((choice) => textSizePercent(choice.value));

    expect(percents).toEqual(percents.toSorted((left, right) => left - right));
    expect(new Set(percents).size).toBe(percents.length);
  });

  it('leaves the book at its own size for the regular choice', () => {
    expect(textSizePercent('regular')).toBe(100);
  });
});

describe('lineSpacingHeight', () => {
  it('opens the lines up across the whole named set', () => {
    const heights = LINE_SPACING_CHOICES.map((choice) => lineSpacingHeight(choice.value));

    expect(heights).toEqual(heights.toSorted((left, right) => left - right));
    expect(new Set(heights).size).toBe(heights.length);
  });
});

describe('textSizeOf', () => {
  it('takes a size the reader has stored', () => {
    expect(textSizeOf('largest')).toBe('largest');
  });

  it.each(['gigantic', undefined, null, 14])(
    'falls back to the default for %j, a size no longer offered or none at all',
    (stored) => {
      expect(textSizeOf(stored)).toBe(DEFAULT_READING_SETTINGS.textSize);
    },
  );
});

describe('lineSpacingOf', () => {
  it('takes a spacing the reader has stored', () => {
    expect(lineSpacingOf('loose')).toBe('loose');
  });

  it('falls back to the default for a spacing no longer offered', () => {
    expect(lineSpacingOf('airy')).toBe(DEFAULT_READING_SETTINGS.lineSpacing);
  });
});

describe('phoneticReadingsOf', () => {
  it.each([false, true])('takes a reader who has set the readings shown to %s', (shown) => {
    expect(phoneticReadingsOf(shown)).toBe(shown);
  });

  it('shows the readings for a record that holds no answer', () => {
    expect(phoneticReadingsOf(undefined)).toBe(true);
    expect(phoneticReadingsOf(null)).toBe(true);
    expect(phoneticReadingsOf('hidden')).toBe(true);
    expect(phoneticReadingsOf(0)).toBe(true);
  });
});

describe('readingSettingsOf', () => {
  it('reads every choice back out of a stored record', () => {
    const settings = readingSettingsOf({
      reader: ONE_READER,
      textSize: 'small',
      lineSpacing: 'tight',
      showPhoneticReadings: false,
    });

    expect(settings).toEqual({
      textSize: 'small',
      lineSpacing: 'tight',
      showPhoneticReadings: false,
    });
  });

  it('answers the defaults for a reader who has stored nothing', () => {
    expect(readingSettingsOf(null)).toEqual(DEFAULT_READING_SETTINGS);
  });

  it.each([
    [
      { reader: ONE_READER, textSize: 'largest', lineSpacing: 'loose' },
      { textSize: 'largest', lineSpacing: 'loose', showPhoneticReadings: true },
    ],
    [
      { reader: ONE_READER, textSize: 'largest' },
      {
        textSize: 'largest',
        lineSpacing: DEFAULT_READING_SETTINGS.lineSpacing,
        showPhoneticReadings: DEFAULT_READING_SETTINGS.showPhoneticReadings,
      },
    ],
  ])(
    'keeps the readable part of the partial record %j and defaults the rest',
    (stored, settings) => {
      expect(readingSettingsOf(stored)).toEqual(settings);
    },
  );
});

describe('storedReadingSettings', () => {
  it('writes one record for the reader, whatever book is open', () => {
    const record = storedReadingSettings({
      textSize: LARGER,
      lineSpacing: LOOSER,
      showPhoneticReadings: false,
    });

    expect(record).toEqual({
      reader: ONE_READER,
      textSize: 'large',
      lineSpacing: 'relaxed',
      showPhoneticReadings: false,
    });
  });
});

describe('withTextSize', () => {
  it('changes the size and leaves the spacing and the readings alone', () => {
    expect(
      withTextSize({ textSize: 'small', lineSpacing: LOOSER, showPhoneticReadings: false }, LARGER),
    ).toEqual({
      textSize: LARGER,
      lineSpacing: LOOSER,
      showPhoneticReadings: false,
    });
  });
});

describe('withLineSpacing', () => {
  it('changes the spacing and leaves the size and the readings alone', () => {
    expect(
      withLineSpacing(
        { textSize: LARGER, lineSpacing: 'tight', showPhoneticReadings: false },
        LOOSER,
      ),
    ).toEqual({
      textSize: LARGER,
      lineSpacing: LOOSER,
      showPhoneticReadings: false,
    });
  });
});

describe('withPhoneticReadings', () => {
  it.each([
    [true, false],
    [false, true],
  ])('turns the readings shown from %s to %s and leaves both scales alone', (before, after) => {
    expect(
      withPhoneticReadings(
        { textSize: LARGER, lineSpacing: LOOSER, showPhoneticReadings: before },
        after,
      ),
    ).toEqual({
      textSize: LARGER,
      lineSpacing: LOOSER,
      showPhoneticReadings: after,
    });
  });
});
