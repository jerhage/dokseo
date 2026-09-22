import { match } from 'ts-pattern';
import type { Result } from '$lib/shared/result';

type TextSize = 'smallest' | 'small' | 'regular' | 'large' | 'largest';

type LineSpacing = 'tight' | 'normal' | 'relaxed' | 'loose';

type ReadingSettings = {
  readonly textSize: TextSize;
  readonly lineSpacing: LineSpacing;
};

type ReadingChoice<T> = {
  readonly value: T;
  readonly label: string;
};

type ReadingSettingsError =
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'storage-failed'; readonly cause: string };

type StoredReadingSettings = {
  readonly reader: string;
  readonly textSize?: string | null;
  readonly lineSpacing?: string | null;
};

const TEXT_SETTINGS_LABEL = 'Text';

const TEXT_SETTINGS_HEADING = 'Text settings';

const TEXT_SIZE_LEGEND = 'Text size';

const LINE_SPACING_LEGEND = 'Line spacing';

const TEXT_SIZE_CHOICES: readonly ReadingChoice<TextSize>[] = [
  { value: 'smallest', label: 'Smallest' },
  { value: 'small', label: 'Small' },
  { value: 'regular', label: 'Regular' },
  { value: 'large', label: 'Large' },
  { value: 'largest', label: 'Largest' },
];

const LINE_SPACING_CHOICES: readonly ReadingChoice<LineSpacing>[] = [
  { value: 'tight', label: 'Tight' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'loose', label: 'Loose' },
];

const DEFAULT_READING_SETTINGS: ReadingSettings = {
  textSize: 'regular',
  lineSpacing: 'normal',
};

const ONE_READER = 'reader';

function textSizePercent(size: TextSize): number {
  return match(size)
    .with('smallest', () => 80)
    .with('small', () => 90)
    .with('regular', () => 100)
    .with('large', () => 115)
    .with('largest', () => 135)
    .exhaustive();
}

function lineSpacingHeight(spacing: LineSpacing): number {
  return match(spacing)
    .with('tight', () => 1.3)
    .with('normal', () => 1.5)
    .with('relaxed', () => 1.75)
    .with('loose', () => 2)
    .exhaustive();
}

function textSizeOf(value: unknown): TextSize {
  if (typeof value !== 'string') return DEFAULT_READING_SETTINGS.textSize;

  const named = TEXT_SIZE_CHOICES.find((choice) => choice.value === value);
  return named === undefined ? DEFAULT_READING_SETTINGS.textSize : named.value;
}

function lineSpacingOf(value: unknown): LineSpacing {
  if (typeof value !== 'string') return DEFAULT_READING_SETTINGS.lineSpacing;

  const named = LINE_SPACING_CHOICES.find((choice) => choice.value === value);
  return named === undefined ? DEFAULT_READING_SETTINGS.lineSpacing : named.value;
}

function readingSettingsOf(stored: StoredReadingSettings | null): ReadingSettings {
  return {
    textSize: textSizeOf(stored?.textSize),
    lineSpacing: lineSpacingOf(stored?.lineSpacing),
  };
}

function storedReadingSettings(settings: ReadingSettings): StoredReadingSettings {
  return {
    reader: ONE_READER,
    textSize: settings.textSize,
    lineSpacing: settings.lineSpacing,
  };
}

function withTextSize(settings: ReadingSettings, textSize: TextSize): ReadingSettings {
  return { textSize, lineSpacing: settings.lineSpacing };
}

function withLineSpacing(settings: ReadingSettings, lineSpacing: LineSpacing): ReadingSettings {
  return { textSize: settings.textSize, lineSpacing };
}

interface ReadingSettingsStore {
  read(): Promise<Result<StoredReadingSettings | null, ReadingSettingsError>>;
  write(settings: ReadingSettings): Promise<Result<void, ReadingSettingsError>>;
}

export {
  DEFAULT_READING_SETTINGS,
  LINE_SPACING_CHOICES,
  LINE_SPACING_LEGEND,
  lineSpacingHeight,
  lineSpacingOf,
  ONE_READER,
  readingSettingsOf,
  storedReadingSettings,
  TEXT_SETTINGS_HEADING,
  TEXT_SETTINGS_LABEL,
  TEXT_SIZE_CHOICES,
  TEXT_SIZE_LEGEND,
  textSizeOf,
  textSizePercent,
  withLineSpacing,
  withTextSize,
};
export type {
  LineSpacing,
  ReadingChoice,
  ReadingSettings,
  ReadingSettingsError,
  ReadingSettingsStore,
  StoredReadingSettings,
  TextSize,
};
