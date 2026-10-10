type ChFont = {
  readonly slug: string;
  readonly label: string;
  readonly theme: string;
  readonly stack: string;
  readonly primary: string | null;
  readonly zeroPixels: number;
  readonly widthPixels: number;
  readonly proseCh: number;
};

type FontStage = 'fallback' | 'web-font';

type RelativeUnit = 'em' | 'rem' | 'ch' | 'ic';

const REFERENCE_CH = 68;

const REFERENCE_FONT_SIZE = 16;

const REM_LINE_LENGTH = 43;

const SAMPLE_SENTENCE =
  'The quick brown fox jumps over the lazy dog while the rain keeps falling over the quiet town. ';

const CH_FONTS = [
  {
    slug: 'system-ui',
    label: 'system-ui',
    theme: 'Base',
    stack: 'system-ui, sans-serif',
    primary: null,
    zeroPixels: 10.078125,
    widthPixels: 685.3125,
    proseCh: 68,
  },
  {
    slug: 'dm-sans',
    label: 'DM Sans',
    theme: 'Petal',
    stack: "'DM Sans', system-ui, sans-serif",
    primary: 'DM Sans',
    zeroPixels: 10.9375,
    widthPixels: 744.1875,
    proseCh: 68,
  },
  {
    slug: 'geist',
    label: 'Geist',
    theme: 'Forge',
    stack: "'Geist', system-ui, sans-serif",
    primary: 'Geist',
    zeroPixels: 10.59375,
    widthPixels: 721.34375,
    proseCh: 68,
  },
  {
    slug: 'figtree',
    label: 'Figtree',
    theme: 'Ember',
    stack: "'Figtree', system-ui, sans-serif",
    primary: 'Figtree',
    zeroPixels: 10.25,
    widthPixels: 697.21875,
    proseCh: 68,
  },
  {
    slug: 'm-plus-rounded',
    label: 'M PLUS Rounded 1c',
    theme: 'Crayon',
    stack: "'M PLUS Rounded 1c', system-ui, sans-serif",
    primary: 'M PLUS Rounded 1c',
    zeroPixels: 9.90625,
    widthPixels: 674.546875,
    proseCh: 68,
  },
  {
    slug: 'archivo',
    label: 'Archivo',
    theme: 'Mono',
    stack: "'Archivo', system-ui, sans-serif",
    primary: 'Archivo',
    zeroPixels: 9.15625,
    widthPixels: 623.09375,
    proseCh: 68,
  },
  {
    slug: 'literata',
    label: 'Literata',
    theme: 'Moss',
    stack: "'Literata', Georgia, serif",
    primary: 'Literata',
    zeroPixels: 9.25,
    widthPixels: 629.9375,
    proseCh: 68,
  },
  {
    slug: 'zen-kaku-gothic-new',
    label: 'Zen Kaku Gothic New',
    theme: 'Yorha',
    stack: "'Zen Kaku Gothic New', 'Noto Sans JP', system-ui, sans-serif",
    primary: 'Zen Kaku Gothic New',
    zeroPixels: 8.0625,
    widthPixels: 548.34375,
    proseCh: 85,
  },
] as const satisfies readonly ChFont[];

type ChFontSlug = (typeof CH_FONTS)[number]['slug'];

function chFont(slug: ChFontSlug): ChFont {
  const found = CH_FONTS.find((font) => font.slug === slug);
  if (found === undefined) throw new Error(`No ch font is named ${slug}`);
  return found;
}

function chPixels(zeroPixelsWide: number, ch: number): number {
  return zeroPixelsWide * ch;
}

function zeroAdvanceOf(measuredWidth: number, ch: number): number {
  return ch > 0 ? measuredWidth / ch : 0;
}

function charactersThatFit(boxWidth: number, sampleWidth: number, sampleLength: number): number {
  if (sampleWidth <= 0 || sampleLength <= 0) return 0;
  return boxWidth / (sampleWidth / sampleLength);
}

function formatPixels(pixels: number): string {
  const rounded = Math.round(pixels * 10) / 10;
  return `${rounded} px`;
}

function formatCount(count: number): string {
  return String(Math.round(count));
}

function fontLoadQuery(primary: string, sizePixels: number): string {
  return `${sizePixels}px "${primary}"`;
}

function stackAtStage(font: ChFont, stage: FontStage): string {
  return stage === 'web-font' ? font.stack : 'system-ui, sans-serif';
}

function lengthIn(unit: RelativeUnit, amount: number): string {
  return `${amount}${unit}`;
}

export {
  CH_FONTS,
  REFERENCE_CH,
  REFERENCE_FONT_SIZE,
  REM_LINE_LENGTH,
  SAMPLE_SENTENCE,
  chFont,
  chPixels,
  charactersThatFit,
  fontLoadQuery,
  formatCount,
  formatPixels,
  lengthIn,
  stackAtStage,
  zeroAdvanceOf,
};
export type { ChFont, ChFontSlug, FontStage, RelativeUnit };
