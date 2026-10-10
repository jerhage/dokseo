<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { CH_FONTS, REFERENCE_CH, chFont, chPixels, formatPixels } from '../../../domain/ch-unit';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import ChLettersDemo from './ChLettersDemo.svelte';
  import ChLineLengthDemo from './ChLineLengthDemo.svelte';
  import ChLoadingDemo from './ChLoadingDemo.svelte';
  import { CH_SECTIONS } from './ch-sections';
  import ChUnitsDemo from './ChUnitsDemo.svelte';
  import ChWidthsDemo from './ChWidthsDemo.svelte';

  const COLUMN_CSS = `.column {
  max-inline-size: 68ch;
}`;

  const PER_THEME_CSS = `:root,
:root[data-theme='base'] {
  --ds-container-prose: 68ch;
}

:root[data-theme='yorha'] {
  --ds-container-prose: 85ch;
}`;

  const REM_CSS = `:root {
  --ds-container-prose: 43rem;
}`;

  const WIDTHS = CH_FONTS.map((font) => font.widthPixels);
  const ZEROS = CH_FONTS.map((font) => font.zeroPixels);
  const YORHA = chFont('zen-kaku-gothic-new');
  const BASE = chFont('system-ui');

  const UNITS: readonly {
    readonly unit: string;
    readonly measures: string;
    readonly follows: string;
  }[] = [
    {
      unit: 'em',
      measures: 'The computed font size of the element.',
      follows: 'The element, and the font size it inherits',
    },
    {
      unit: 'rem',
      measures: 'The computed font size of the root element.',
      follows: 'The page only',
    },
    {
      unit: 'ex',
      measures: 'The x-height of the first available font, the height of a lowercase x.',
      follows: 'The font and its size',
    },
    {
      unit: 'cap',
      measures: 'The cap height of the first available font, the height of a capital letter.',
      follows: 'The font and its size',
    },
    {
      unit: 'ch',
      measures: 'The advance width of the 0 glyph in the first available font.',
      follows: 'The font and its size',
    },
    {
      unit: 'ic',
      measures: 'Defined as the advance width of the glyph 水 in the first available font.',
      follows: 'The font and its size',
    },
    {
      unit: 'lh',
      measures: 'The computed line height of the element.',
      follows: 'The element, and its line-height',
    },
  ];
</script>

<DocsSection title={CH_SECTIONS.meaning}>
  <p>
    <code>1ch</code> is the advance width of the glyph "0" in the element's first available font, at
    the element's computed font size. The advance is how far the pen moves after drawing the glyph,
    so it includes the space on both sides. The specification says a font with no "0" falls back to
    <code>0.5em</code>.
  </p>
  <p>
    A <code>px</code> length is the same everywhere. A <code>ch</code> length is a count of zeros, so
    its size in pixels is that count times the width of one zero, and the width of one zero belongs to
    the font.
  </p>
  <DocsCode label="A column in ch" code={COLUMN_CSS} />
  <p>
    The next section measures that column in eight fonts. At 16px the "0" of each font is between {formatPixels(
      Math.min(...ZEROS),
    )}
    and {formatPixels(Math.max(...ZEROS))} wide, so a column of {REFERENCE_CH}ch is between {formatPixels(
      Math.min(...WIDTHS),
    )} and {formatPixels(Math.max(...WIDTHS))}.
  </p>
</DocsSection>

<DocsSection title={CH_SECTIONS.widths}>
  <p>
    These are the fonts Dokseo's themes use for body text, measured in Chromium at 16px. Each theme
    has its own font, and the table lists the pixel width of {REFERENCE_CH}ch in each.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Theme</TableHeaderCell>
        <TableHeaderCell>Font</TableHeaderCell>
        <TableHeaderCell numeric>0 at 16px</TableHeaderCell>
        <TableHeaderCell numeric>{REFERENCE_CH}ch</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each CH_FONTS as font (font.slug)}
        <TableRow>
          <TableCell>{font.theme}</TableCell>
          <TableCell>{font.label}</TableCell>
          <TableCell numeric class="mono">{formatPixels(font.zeroPixels)}</TableCell>
          <TableCell numeric class="mono">{formatPixels(font.widthPixels)}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The widest column is {formatPixels(Math.max(...WIDTHS))} and the narrowest is {formatPixels(
      Math.min(...WIDTHS),
    )}, from the same CSS. The demo below measures this browser's own rendering, and a different
    operating system or font version can differ from the table.
  </p>
  <ChWidthsDemo />
</DocsSection>

<DocsSection title={CH_SECTIONS.letters}>
  <p>
    The name suggests "characters", and a column of 68ch does not hold 68 characters of text. It
    holds 68 zeros. Zero is a wide digit in many fonts, because digits are often drawn at one width
    so that columns of numbers line up. Letters such as i, l and t are far narrower than a zero, and
    the letters of an ordinary sentence average out narrower too. How much narrower depends on the
    font.
  </p>
  <ChLettersDemo />
  <p>
    So the number of letters on a line is the ch value times a ratio that no CSS value controls: the
    width of a zero over the average width of the text.
  </p>
</DocsSection>

<DocsSection title={CH_SECTIONS.loading}>
  <p>
    A <code>font-family</code> is a list. The browser works down the list and the first font that is
    available is the one <code>ch</code> uses. A web font is not available until its file has downloaded,
    so for a moment the first available font is the fallback, and the "0" in the calculation is the fallback's.
  </p>
  <p>
    Dokseo's <code>@font-face</code> rules use <code>font-display: swap</code>. The text paints in
    the fallback first and is drawn again when the file arrives. A column sized in <code>ch</code> is
    resized at the same moment, so its edges move.
  </p>
  <ChLoadingDemo />
</DocsSection>

<DocsSection title={CH_SECTIONS.units}>
  <p>
    <code>ch</code> is one of several lengths that depend on a font or a font size.
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Unit</TableHeaderCell>
        <TableHeaderCell>What it measures</TableHeaderCell>
        <TableHeaderCell>What changes it</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each UNITS as row (row.unit)}
        <TableRow>
          <TableCell class="mono">{row.unit}</TableCell>
          <TableCell>{row.measures}</TableCell>
          <TableCell>{row.follows}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    <code>ic</code> is meant for Japanese, Chinese and Korean text: the glyph 水 is a full-width
    ideograph, so <code>1ic</code> should be the width of one character cell in a CJK font. The
    specification gives <code>1em</code> to a font with no such glyph. In this Chromium at 16px,
    <code>20ic</code> measures 320 px in all eight fonts, the same as <code>20em</code>.
  </p>
  <ChUnitsDemo />
</DocsSection>

<DocsSection title={CH_SECTIONS.lineLength}>
  <p>
    A line length is usually set as a maximum width on the text column. Two ways to write it keep
    appearing, and they trade different things.
  </p>
  <p>
    <strong>A ch value for each font.</strong> A ch length follows the font, so the same value gives
    a similar number of letters per line when the font changes, and a different width in pixels. The
    Kandan UI core makes <code>--ds-container-prose</code> a value each theme sets. Seven themes use
    <code>68ch</code> and Yorha uses <code>85ch</code>, because Zen Kaku Gothic New draws a narrow
    "0" and 68ch came out {formatPixels(YORHA.widthPixels)} wide there. At 85ch the Yorha column is {formatPixels(
      chPixels(YORHA.zeroPixels, YORHA.proseCh),
    )} and the base theme's 68ch column is {formatPixels(BASE.widthPixels)}.
  </p>
  <DocsCode label="A prose width set by each theme" code={PER_THEME_CSS} />
  <p>
    <strong>A rem value.</strong> A rem length is the same number of pixels in every font. The column
    is the same size on the screen in every theme, and the number of letters on a line changes with the
    font. There is also one value to maintain and nothing to retune when a font is added.
  </p>
  <DocsCode label="A prose width in rem" code={REM_CSS} />
  <ChLineLengthDemo />
  <p>
    The table compares the two in this browser. The ch columns have a similar number of letters per
    line in every font but a width that moves. The rem columns have one width and a letter count
    that moves.
  </p>
</DocsSection>
