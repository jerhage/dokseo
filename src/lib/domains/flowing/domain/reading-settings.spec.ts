import { describe, expect, it } from 'vitest';
import {
  DEFAULT_READING_SETTINGS,
  LINE_SPACING_CHOICES,
  lineSpacingHeight,
  lineSpacingOf,
  ONE_READER,
  readingSettingsOf,
  storedReadingSettings,
  TEXT_SIZE_CHOICES,
  textSizeOf,
  textSizePercent,
  withLineSpacing,
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

describe('readingSettingsOf', () => {
  it('reads both choices back out of a stored record', () => {
    const settings = readingSettingsOf({
      reader: ONE_READER,
      textSize: 'small',
      lineSpacing: 'tight',
    });

    expect(settings).toEqual({ textSize: 'small', lineSpacing: 'tight' });
  });

  it('answers the defaults for a reader who has stored nothing', () => {
    expect(readingSettingsOf(null)).toEqual(DEFAULT_READING_SETTINGS);
  });

  it('keeps the readable half of a record whose other half is unusable', () => {
    const settings = readingSettingsOf({ reader: ONE_READER, textSize: 'largest' });

    expect(settings).toEqual({
      textSize: 'largest',
      lineSpacing: DEFAULT_READING_SETTINGS.lineSpacing,
    });
  });
});

describe('storedReadingSettings', () => {
  it('writes one record for the reader, whatever book is open', () => {
    const record = storedReadingSettings({ textSize: LARGER, lineSpacing: LOOSER });

    expect(record).toEqual({ reader: ONE_READER, textSize: 'large', lineSpacing: 'relaxed' });
  });

  it('survives a round trip through storage unchanged', () => {
    const settings = { textSize: LARGER, lineSpacing: LOOSER };

    expect(readingSettingsOf(storedReadingSettings(settings))).toEqual(settings);
  });
});

describe('withTextSize', () => {
  it('changes the size and leaves the spacing alone', () => {
    expect(withTextSize({ textSize: 'small', lineSpacing: LOOSER }, LARGER)).toEqual({
      textSize: LARGER,
      lineSpacing: LOOSER,
    });
  });
});

describe('withLineSpacing', () => {
  it('changes the spacing and leaves the size alone', () => {
    expect(withLineSpacing({ textSize: LARGER, lineSpacing: 'tight' }, LOOSER)).toEqual({
      textSize: LARGER,
      lineSpacing: LOOSER,
    });
  });
});
