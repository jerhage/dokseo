type NormalizationForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';

type NormalizedPiece = {
  readonly form: NormalizationForm;
  readonly text: string;
  readonly codePoints: readonly string[];
  readonly changed: boolean;
};

type GraphemeRow = {
  readonly grapheme: string;
  readonly codePoints: readonly string[];
  readonly units: readonly string[];
  readonly bytes: readonly string[];
  readonly forms: readonly NormalizedPiece[];
};

type TextCounts = {
  readonly units: number;
  readonly codePoints: number;
  readonly graphemes: number;
  readonly bytes: number;
};

type CollatorSensitivity = 'base' | 'accent' | 'case' | 'variant';

type Comparison = {
  readonly label: string;
  readonly equal: boolean;
};

type WordGranularity = 'grapheme' | 'word' | 'sentence';

type TextSegment = {
  readonly segment: string;
  readonly index: number;
  readonly wordLike: boolean;
};

const NORMALIZATION_FORMS: readonly NormalizationForm[] = ['NFC', 'NFD', 'NFKC', 'NFKD'];

const COLLATOR_SENSITIVITIES: readonly CollatorSensitivity[] = [
  'base',
  'accent',
  'case',
  'variant',
];

const SEGMENTER_LOCALE = 'ja';

const UTF8 = new TextEncoder();

function hex(value: number, width: number): string {
  return value.toString(16).toUpperCase().padStart(width, '0');
}

function codePointsOf(text: string): readonly string[] {
  return Array.from(text, (character) => `U+${hex(character.codePointAt(0) ?? 0, 4)}`);
}

function unitsOf(text: string): readonly string[] {
  const units: string[] = [];
  for (let index = 0; index < text.length; index += 1) units.push(hex(text.charCodeAt(index), 4));
  return units;
}

function bytesOf(text: string): readonly string[] {
  return Array.from(UTF8.encode(text), (byte) => hex(byte, 2));
}

function segmentedText(text: string, granularity: WordGranularity): readonly TextSegment[] {
  const segmenter = new Intl.Segmenter(SEGMENTER_LOCALE, { granularity });
  return Array.from(segmenter.segment(text), (found) => ({
    segment: found.segment,
    index: found.index,
    wordLike: found.isWordLike ?? false,
  }));
}

function graphemesOf(text: string): readonly string[] {
  return segmentedText(text, 'grapheme').map((found) => found.segment);
}

function normalizedPiece(text: string, form: NormalizationForm): NormalizedPiece {
  const normalized = text.normalize(form);
  return {
    form,
    text: normalized,
    codePoints: codePointsOf(normalized),
    changed: normalized !== text,
  };
}

function graphemeRows(text: string): readonly GraphemeRow[] {
  return graphemesOf(text).map((grapheme) => ({
    grapheme,
    codePoints: codePointsOf(grapheme),
    units: unitsOf(grapheme),
    bytes: bytesOf(grapheme),
    forms: NORMALIZATION_FORMS.map((form) => normalizedPiece(grapheme, form)),
  }));
}

function textCounts(text: string): TextCounts {
  return {
    units: text.length,
    codePoints: Array.from(text).length,
    graphemes: graphemesOf(text).length,
    bytes: UTF8.encode(text).length,
  };
}

function wholeForms(text: string): readonly NormalizedPiece[] {
  return NORMALIZATION_FORMS.map((form) => normalizedPiece(text, form));
}

function collatorEqual(
  left: string,
  right: string,
  locale: string,
  sensitivity: CollatorSensitivity,
): boolean {
  return new Intl.Collator(locale, { sensitivity }).compare(left, right) === 0;
}

function plainComparisons(left: string, right: string): readonly Comparison[] {
  return [
    { label: 'left === right', equal: left === right },
    { label: 'NFC on both sides', equal: left.normalize('NFC') === right.normalize('NFC') },
    { label: 'NFKC on both sides', equal: left.normalize('NFKC') === right.normalize('NFKC') },
  ];
}

function collatorComparisons(left: string, right: string, locale: string): readonly Comparison[] {
  return COLLATOR_SENSITIVITIES.map((sensitivity) => ({
    label: `Intl.Collator('${locale}', { sensitivity: '${sensitivity}' })`,
    equal: collatorEqual(left, right, locale, sensitivity),
  }));
}

function spaceSplit(text: string): readonly string[] {
  return text.split(' ').filter((part) => part.length > 0);
}

export {
  COLLATOR_SENSITIVITIES,
  NORMALIZATION_FORMS,
  bytesOf,
  codePointsOf,
  collatorComparisons,
  graphemeRows,
  graphemesOf,
  plainComparisons,
  segmentedText,
  spaceSplit,
  textCounts,
  unitsOf,
  wholeForms,
};
export type {
  CollatorSensitivity,
  Comparison,
  GraphemeRow,
  NormalizationForm,
  NormalizedPiece,
  TextCounts,
  TextSegment,
  WordGranularity,
};
