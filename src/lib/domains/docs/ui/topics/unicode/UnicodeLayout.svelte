<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { EPUB_VERTICAL_HREF, UNICODE_SECTIONS, unicodeHref } from './unicode-sections';
  import VerticalPlaygroundDemo from './VerticalPlaygroundDemo.svelte';
  import WordSegmentDemo from './WordSegmentDemo.svelte';

  const VERTICAL_CSS = `.page {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.page .number {
  text-combine-upright: all;
}`;

  const RUBY_MARKUP = `<ruby>漢<rp>（</rp><rt>かん</rt><rp>）</rp>字<rp>（</rp><rt>じ</rt><rp>）</rp></ruby>`;

  const RUBY_TEXT = `const word = document.createElement('ruby');
word.innerHTML = '鍵<rt>かぎ</rt>';
word.textContent; // '鍵かぎ'`;
</script>

<DocsSection title={UNICODE_SECTIONS.words}>
  <p>
    Japanese writes words with no spaces between them, so <code>split(' ')</code> returns a whole sentence
    as one word. Finding word boundaries takes knowledge of the language: UAX #29 says that reliable word
    boundaries in Thai, Lao, Chinese or Japanese need dictionary lookup or other mechanisms. Its default
    rules keep a run of katakana together (rule WB13) and otherwise break around every kanji and hiragana.
  </p>
  <p>
    <code>Intl.Segmenter</code> with <code>granularity: 'word'</code> goes further in ICU, the
    library behind Node and Chromium, which uses a dictionary for Chinese and Japanese words. Each
    segment comes with
    <code>isWordLike</code>, false for punctuation and spaces. The result is a guess, not a grammar:
    the classic tongue twister <span lang="ja">すもももももももものうち</span> is mostly the
    particle
    <span lang="ja">も</span> and the noun <span lang="ja">もも</span>, and a dictionary split
    cannot always tell which is which. ICU in Node 24 gets several of them wrong.
  </p>
  <WordSegmentDemo />
  <p>
    A segmenter finds where words start and end. It does not say what a word is, what its base form
    is or how it is read; that is a morphological analyzer's job, a separate and much larger tool.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.lineBreaks}>
  <p>
    Line breaking is a separate question from word boundaries, with its own annex, UAX #14. In
    Japanese a line may break between almost any two characters: ideographs "can ordinarily break
    before and after and between pairs". The exceptions are the rules Japanese typography calls
    kinsoku: closing punctuation such as <span lang="ja">。</span> and
    <span lang="ja">、</span> must not start a line, and opening brackets must not end one.
  </p>
  <p>
    Small kana such as <span lang="ja">っ</span> and <span lang="ja">ゃ</span>, and the prolonged
    sound mark <span lang="ja">ー</span>, are a matter of taste. UAX #14 puts them in a class of
    their own, the conditional Japanese starter, and CSS chooses with the <code>line-break</code>
    property:
    <code>strict</code> keeps them off the start of a line, <code>normal</code> lets them start one,
    and <code>loose</code> relaxes the rules further for narrow columns.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.vertical}>
  <p>
    Japanese books and manga are set in vertical columns, read top to bottom, with the columns
    running right to left. CSS writes this with <code>writing-mode</code>:
  </p>
  <ul>
    <li><code>horizontal-tb</code>: horizontal lines stacked top to bottom, the default.</li>
    <li>
      <code>vertical-rl</code>: vertical lines stacked right to left, the Japanese book layout.
    </li>
    <li>
      <code>vertical-lr</code>: vertical lines stacked left to right, used by Mongolian, among
      others.
    </li>
  </ul>
  <p>
    Everything that CSS calls inline or block follows the mode. In <code>vertical-rl</code>,
    <code>inline-size</code> is the height of a column, <code>block-size</code> is the width of the
    page, and the start of a line is its top. That is why logical properties, such as
    <code>margin-block-start</code> instead of <code>margin-top</code>, keep a layout correct in
    either mode. How an EPUB declares its writing mode is on the EPUB page, in
    <a href={EPUB_VERTICAL_HREF}>vertical text and right-to-left pages</a>.
  </p>
  <DocsCode label="Vertical text in CSS" code={VERTICAL_CSS} />
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.orientation}>
  <p>
    A vertical line still has to place each character, and characters disagree about which way up
    they go. Kana and kanji stand upright. Latin letters, in a Japanese vertical line, are usually
    turned on their side, so that a word reads with the head tilted. Unicode records the usual
    choice for each code point in the <code>Vertical_Orientation</code> property of UAX #50:
    <code>U</code>
    for upright, <code>R</code> for rotated, and <code>Tu</code> and <code>Tr</code> for characters
    that need a different glyph in vertical text, such as <span lang="ja">。</span>, the small kana,
    corner brackets and <span lang="ja">ー</span>, which turns into a vertical stroke.
  </p>
  <p>
    <code>text-orientation</code> decides how to apply it. <code>mixed</code>, the default, follows
    the property: kana upright, Latin sideways. <code>upright</code> stands every character up, so
    <code>OCR</code> becomes three stacked letters. <code>sideways</code> lays the whole line out horizontally
    and turns it, kana included.
  </p>
  <p>
    Short runs of digits or Latin letters are often set across the column instead, in the space of
    one character. Japanese typesetters call it tate-chu-yoko, horizontal in vertical, and CSS
    writes it as <code>text-combine-upright: all</code> on the run. The CSS Writing Modes specification
    intends it for runs of two to four characters, and squeezes the run if it is wider than the column.
  </p>
  <VerticalPlaygroundDemo />
  <p>
    Switch to <code>horizontal-tb</code> and the same markup becomes an ordinary paragraph: the orientation
    and the combined numbers only apply in a vertical mode.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.ruby}>
  <p>
    Furigana are small kana printed beside a kanji to show how it is read, the way a children's book
    or a manga for younger readers prints them on every hard word. HTML marks them up with ruby: the
    <code>ruby</code> element holds the base text and its annotations, and each <code>rt</code>
    holds one annotation. The <code>rp</code> element holds parentheses "to be shown by user agents that
    don't support ruby annotations"; a browser that supports ruby hides them. The HTML standard's own
    example:
  </p>
  <DocsCode label="Ruby with fallback parentheses" code={RUBY_MARKUP} />
  <p>
    In vertical text the readings sit to the right of the column, and in horizontal text above the
    line. The playground above has a switch that hides every <code>rt</code> and <code>rp</code>
    with
    <code>display: none</code>, which is how a reader can turn furigana off.
  </p>
  <p>
    Ruby text is still text in the document. <code>textContent</code> on a ruby element returns the base
    and the reading run together, so code that copies or searches the text has to leave the readings out
    on purpose:
  </p>
  <DocsCode label="The reading is part of the text" code={RUBY_TEXT} />
  <p>
    <a href={unicodeHref('offsets')}>Offsets in a CFI and a quote</a> shows how Dokseo removes the readings
    from what it stores.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.han}>
  <p>
    Chinese, Japanese and Korean share thousands of characters, and Unicode encodes each one once,
    even where the three traditions draw it a little differently. The Unicode FAQ puts it plainly:
    the standard encodes characters, not glyphs, and drawing Japanese text the Japanese way is "a
    font issue, not a character encoding issue".
  </p>
  <p>
    So the same code point can look Japanese or Chinese depending on the font. On the web the font
    follows the language: the <code>lang</code> attribute tells the browser which language an
    element is in, and CSS can match it with <code>:lang(ja)</code> to choose a Japanese font. Text
    with no
    <code>lang</code>, or the wrong one, is drawn in whatever font the page's styles and the
    browser's fallback list produce, which can be a Chinese one.
  </p>
</DocsSection>
