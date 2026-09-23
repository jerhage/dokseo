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

  it('falls back to the default for a size no longer offered', () => {
    expect(textSizeOf('gigantic')).toBe(DEFAULT_READING_SETTINGS.textSize);
  });

  it('falls back to the default for a record that holds no size', () => {
    expect(textSizeOf(undefined)).toBe(DEFAULT_READING_SETTINGS.textSize);
    expect(textSizeOf(null)).toBe(DEFAULT_READING_SETTINGS.textSize);
    expect(textSizeOf(14)).toBe(DEFAULT_READING_SETTINGS.textSize);
  });
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
  it('takes a reader who has turned the readings off', () => {
    expect(phoneticReadingsOf(false)).toBe(false);
  });

  it('takes a reader who has turned the readings back on', () => {
    expect(phoneticReadingsOf(true)).toBe(true);
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

  it('shows the readings for a record written before the choice existed', () => {
    const settings = readingSettingsOf({
      reader: ONE_READER,
      textSize: 'largest',
      lineSpacing: 'loose',
    });

    expect(settings).toEqual({
      textSize: 'largest',
      lineSpacing: 'loose',
      showPhoneticReadings: true,
    });
  });

  it('keeps the readable half of a record whose other half is unusable', () => {
    const settings = readingSettingsOf({ reader: ONE_READER, textSize: 'largest' });

    expect(settings).toEqual({
      textSize: 'largest',
      lineSpacing: DEFAULT_READING_SETTINGS.lineSpacing,
      showPhoneticReadings: DEFAULT_READING_SETTINGS.showPhoneticReadings,
    });
  });
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

  it('survives a round trip through storage unchanged', () => {
    const settings = { textSize: LARGER, lineSpacing: LOOSER, showPhoneticReadings: false };

    expect(readingSettingsOf(storedReadingSettings(settings))).toEqual(settings);
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
  it('hides the readings and leaves both scales alone', () => {
    expect(
      withPhoneticReadings(
        { textSize: LARGER, lineSpacing: LOOSER, showPhoneticReadings: true },
        false,
      ),
    ).toEqual({
      textSize: LARGER,
      lineSpacing: LOOSER,
      showPhoneticReadings: false,
    });
  });

  it('shows them again for a reader who turns the choice back on', () => {
    expect(
      withPhoneticReadings(
        { textSize: LARGER, lineSpacing: LOOSER, showPhoneticReadings: false },
        true,
      ).showPhoneticReadings,
    ).toBe(true);
  });
});
