<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import SameOrNotDemo from './SameOrNotDemo.svelte';
  import StringInspectorDemo from './StringInspectorDemo.svelte';
  import { ENCODING_LAYERS, NORMALIZATION_SQUARE } from './unicode-diagrams';
  import { UNICODE_SECTIONS, unicodeHref } from './unicode-sections';

  const STRING_UNITS = `const scold = '𠮟る';

scold.length;            // 3: two units for 𠮟, one for る
scold[0];                // '\\uD842', half of 𠮟, not a character
[...scold].length;       // 2: the string iterator walks code points
scold.codePointAt(0);    // 0x20B9F
scold.slice(0, 1);       // a lone surrogate`;

  const GRAPHEME_COUNT = `const graphemes = new Intl.Segmenter('ja', { granularity: 'grapheme' });

[...graphemes.segment('か\\u3099')].length; // 1
'か\\u3099'.length;                          // 2`;

  const NORMALIZE_CALLS = `'か\\u3099'.normalize('NFC');  // 'が', U+304C
'が'.normalize('NFD');        // 'か\\u3099'
'ｶﾞ'.normalize('NFC');        // 'ｶﾞ', unchanged
'ｶﾞ'.normalize('NFKC');       // 'ガ'`;

  const ENCODED: readonly {
    readonly character: string;
    readonly point: string;
    readonly utf16: string;
    readonly utf8: string;
  }[] = [
    { character: 'A', point: 'U+0041', utf16: '0041', utf8: '41' },
    { character: 'é', point: 'U+00E9', utf16: '00E9', utf8: 'C3 A9' },
    { character: 'あ', point: 'U+3042', utf16: '3042', utf8: 'E3 81 82' },
    { character: '猫', point: 'U+732B', utf16: '732B', utf8: 'E7 8C AB' },
    { character: '𠮟', point: 'U+20B9F', utf16: 'D842 DF9F', utf8: 'F0 A0 AE 9F' },
  ];

  const COMPATIBLE: readonly {
    readonly from: string;
    readonly to: string;
    readonly kind: string;
  }[] = [
    {
      from: 'ｶﾞｲﾄﾞ',
      to: 'ガイド',
      kind: 'Half-width katakana, with a separate half-width voiced mark',
    },
    { from: 'ＡＢＣ１２', to: 'ABC12', kind: 'Full-width Latin letters and digits' },
    { from: '㌔', to: 'キロ', kind: 'A katakana word squeezed into one square' },
    { from: '㍿', to: '株式会社', kind: 'A square abbreviation of 株式会社, a kind of company' },
    { from: '①', to: '1', kind: 'A circled number' },
    { from: 'ﬁ', to: 'fi', kind: 'A Latin ligature' },
    { from: '゛', to: 'a space, then U+3099', kind: 'The spacing voiced mark' },
  ];
</script>

<DocsSection title={UNICODE_SECTIONS.characters}>
  <p>
    A string looks like a list of characters, and for English text that picture rarely fails. For
    Japanese it fails often, because "character" means at least three different things, and each API
    counts a different one.
  </p>
  <ul>
    <li>
      A <strong>code point</strong> is a number Unicode assigns to one abstract character, written
      <code>U+</code> and hex: <code>U+3042</code> is <span lang="ja">あ</span>. The numbers run
      from
      <code>U+0000</code> to <code>U+10FFFF</code>. The first 65,536, up to <code>U+FFFF</code>, are
      the Basic Multilingual Plane, the BMP, and hold almost every character in everyday use.
    </li>
    <li>
      A <strong>code unit</strong> is the fixed-size piece an encoding stores: 8 bits in UTF-8, 16 bits
      in UTF-16. One code point takes one or more code units.
    </li>
    <li>
      A <strong>grapheme</strong> is what a reader sees as one character. It can be several code
      points:
      <span lang="ja">が</span> can be stored as <span lang="ja">か</span> followed by a separate voiced
      mark, and a family emoji is three people joined by invisible joiners.
    </li>
  </ul>
  <Figure>
    <Diagram {...ENCODING_LAYERS} />
    {#snippet caption()}
      One grapheme, two code points, and each code point stored as one UTF-16 unit or three UTF-8
      bytes.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.encodings}>
  <p>
    An encoding turns code points into bytes. UTF-8 and UTF-16 can both store every code point; they
    differ in unit size.
  </p>
  <ul>
    <li>
      <strong>UTF-8</strong> uses one byte for ASCII, two for most European accented letters, three
      for the rest of the BMP, kana and nearly all kanji included, and four above it. Files, HTML
      and network traffic are almost always UTF-8, and <code>TextEncoder</code> always produces it.
    </li>
    <li>
      <strong>UTF-16</strong> uses one 16-bit unit for every BMP code point. A code point above
      <code>U+FFFF</code> takes two units, a <em>surrogate pair</em>: a high surrogate from
      <code>D800</code> to <code>DBFF</code> and a low one from <code>DC00</code> to
      <code>DFFF</code>, a range reserved so that no real character uses it.
    </li>
  </ul>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Character</TableHeaderCell>
        <TableHeaderCell>Code point</TableHeaderCell>
        <TableHeaderCell>UTF-16 units</TableHeaderCell>
        <TableHeaderCell>UTF-8 bytes</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each ENCODED as row (row.point)}
        <TableRow>
          <TableCell class="text-lg" lang="ja">{row.character}</TableCell>
          <TableCell class="mono">{row.point}</TableCell>
          <TableCell class="mono">{row.utf16}</TableCell>
          <TableCell class="mono">{row.utf8}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    Japanese text is mostly three bytes per character in UTF-8 and two in UTF-16. The four-byte case
    is not exotic either: <span lang="ja">𠮟</span>, in <span lang="ja">𠮟る</span> (to scold), sits
    above the BMP, and so do some kanji used in names, such as <span lang="ja">𠮷</span> in
    <span lang="ja">𠮷野家</span>.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.strings}>
  <p>
    A JavaScript string is a sequence of UTF-16 code units, and most of the string API counts units.
    <code>length</code> is the number of units, indexing returns one unit, and <code>slice</code> cuts
    between units, even in the middle of a surrogate pair.
  </p>
  <DocsCode label="Code units and code points in JavaScript" code={STRING_UNITS} />
  <p>
    A lone surrogate is a legal JavaScript string but not valid Unicode text.
    <code>TextEncoder</code> writes it as <code>U+FFFD</code>, the replacement character, and
    <code>encodeURIComponent</code> throws a <code>URIError</code>, so a cut in the wrong place
    shows up later as <span lang="ja">�</span> in a file or as an exception.
  </p>
  <p>
    The string iterator is the exception: <code>for…of</code>, spread and <code>Array.from</code> walk
    code points, so a surrogate pair comes out whole. That fixes the BMP boundary and nothing else, because
    a code point is still not a grapheme.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.graphemes}>
  <p>
    Unicode's text segmentation annex, UAX #29, defines the <em>extended grapheme cluster</em>, its
    best approximation of a user-perceived character that a program can compute: a base character
    with the marks that combine with it, an emoji sequence joined by zero-width joiners, a flag made
    of two regional indicators. <code>Intl.Segmenter</code> with
    <code>granularity: 'grapheme'</code>
    implements it.
  </p>
  <DocsCode label="Counting graphemes" code={GRAPHEME_COUNT} />
  <p>
    The inspector shows all four counts for any text. Try the decomposed <span lang="ja">が</span>,
    the emoji, and <span lang="ja">𠮟る</span>: each makes a different pair of counts disagree.
  </p>
  <StringInspectorDemo />
  <p>
    The rule of thumb that follows: store and compare strings as strings, count units only to index
    into them, and use graphemes whenever the count or the cut is something a reader sees, such as a
    length limit, a cursor step or a truncated title.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.combining}>
  <p>
    A <em>combining mark</em> is a code point that draws onto the character before it instead of
    taking its own place. Japanese has two: <code>U+3099</code>, the combining voiced sound mark
    (dakuten), and <code>U+309A</code>, the combining semi-voiced mark (handakuten). Together with
    <span lang="ja">か</span> the first draws <span lang="ja">が</span>; with
    <span lang="ja">は</span> the second draws <span lang="ja">ぱ</span>.
  </p>
  <p>
    Unicode also has precomposed characters for the common pairs: <span lang="ja">が</span> is
    <code>U+304C</code> by itself. So the same visible <span lang="ja">が</span> has two encodings,
    one code point or two, and <code>===</code> calls them different. The standard calls such
    sequences
    <em>canonically equivalent</em>: they "represent the same abstract character" and should look
    and behave the same.
  </p>
  <p>
    Two more marks look like dakuten and are not combining: <code>U+309B</code>
    <span lang="ja">゛</span> and <code>U+309C</code> <span lang="ja">゜</span>, the spacing forms,
    which take their own place. They turn up in text typed or converted from old systems, such as
    <span lang="ja">か゛</span>.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.normalization}>
  <p>
    Normalization rewrites a string into one chosen form, so that equivalent strings become equal
    strings. UAX #15 defines four forms on two axes. One axis is the kind of equivalence:
    <em>canonical</em>, for sequences that are the same character, or <em>compatibility</em>, a
    weaker one for characters that "may have distinct visual appearances or behaviors" but stand for
    the same thing. The other is whether the result is decomposed into base characters and marks, or
    composed again afterwards.
  </p>
  <Figure>
    <Diagram {...NORMALIZATION_SQUARE} />
    {#snippet caption()}
      NFC and NFD only reorganize canonically equivalent sequences. The K forms also replace
      compatibility characters.
    {/snippet}
  </Figure>
  <DocsCode label="String.prototype.normalize" code={NORMALIZE_CALLS} />
  <p>
    Every form is idempotent: normalizing twice gives the same result as once. NFC changes nothing a
    reader can see, which makes it safe to apply to any text before storing it. The K forms change
    what the text says, and UAX #15 warns that they "must not be blindly applied to arbitrary text".
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.compatibility}>
  <p>
    Japanese text is full of compatibility characters, mostly inherited from older Japanese
    character sets that had their own half-width and full-width copies of letters. NFKC maps each
    one onto its plain counterpart:
  </p>
  <Table size="sm">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Text</TableHeaderCell>
        <TableHeaderCell>After NFKC</TableHeaderCell>
        <TableHeaderCell>What it is</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each COMPATIBLE as row (row.from)}
        <TableRow>
          <TableCell class="text-lg" lang="ja">{row.from}</TableCell>
          <TableCell lang="ja">{row.to}</TableCell>
          <TableCell>{row.kind}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    That is the right tool for matching a search against a title, and the wrong one for storing the
    title: a volume called <span lang="ja">①巻</span> would come back as
    <span lang="ja">1巻</span>. The last row is a surprise worth knowing: NFKC turns the spacing
    mark into a real space followed by the combining mark, so a naive fold of
    <span lang="ja">か゛</span>
    puts a space in the middle of a word.
  </p>
  <p>
    Hiragana and katakana are not equivalent under any of the four forms. <span lang="ja">ねこ</span
    >
    and <span lang="ja">ネコ</span> are different characters to Unicode, as they are to a reader of Japanese,
    even if a search would want them to match.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.caseFolding}>
  <p>
    Case folding maps letters to one case so that comparisons ignore it. In JavaScript the usual
    tool is <code>toLowerCase()</code>, and even in English it is not one character to one
    character:
    <code>'ß'.toUpperCase()</code> is <code>'SS'</code>.
  </p>
  <p>
    Kana and kanji have no case, so case folding does nothing to them. Japanese text still needs
    folding before a comparison, of other kinds: width (half-width <span lang="ja">ｶ</span> against
    <span lang="ja">カ</span>), composition (two encodings of <span lang="ja">が</span>), and, where
    the application decides it should, hiragana against katakana. Full-width Latin letters do have
    case: <code>'Ａ'.toLowerCase()</code> is <code>'ａ'</code>, still full-width, so width and case
    are separate steps.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.comparing}>
  <p>
    <code>===</code> compares code units, and the default <code>sort()</code> orders by code units
    too. A <em>collator</em> compares the way a language sorts. <code>Intl.Collator</code> exposes
    the Unicode Collation Algorithm, which compares at levels: base letters first, then accents,
    then case and other variants. The <code>sensitivity</code> option chooses how many levels count,
    from
    <code>base</code> (only base letters) to <code>variant</code> (everything), which is the default for
    sorting.
  </p>
  <p>
    What counts as a base letter, an accent or a variant depends on the locale's rules. With the
    <code>ja</code> locale, in Node, Chromium and WebKit alike,
    <span lang="ja">か</span> and <span lang="ja">カ</span> compare equal even at
    <code>variant</code>, while the root rules separate them; the voiced
    <span lang="ja">が</span> differs from <span lang="ja">か</span> at the accent level. The demo runs
    each comparison in this browser:
  </p>
  <SameOrNotDemo />
  <p>
    A collator answers "do these sort as the same?", which is a different question from "are these
    the same name?". It ignores what its rules ignore and nothing else, and its rules can change
    with the browser's ICU version. For an equality that a program relies on, such as two tags
    merging into one, an explicit fold is easier to reason about, and <a href={unicodeHref('tags')}
      >Tag names</a
    >
    shows one.
  </p>
</DocsSection>
