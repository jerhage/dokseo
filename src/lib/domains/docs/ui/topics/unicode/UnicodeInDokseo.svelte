<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import NaturalOrderDemo from './NaturalOrderDemo.svelte';
  import SearchFoldDemo from './SearchFoldDemo.svelte';
  import {
    EPUB_ANCHORING_HREF,
    EPUB_CFI_HREF,
    EPUB_PROBE_HREF,
    EPUB_SETTINGS_HREF,
    EPUB_STYLES_HREF,
    EXPORT_TAGS_HREF,
    IDENTITY_LADDER_HREF,
    IDENTITY_NAMES_HREF,
    OCR_PIPELINE_HREF,
    OCR_TOKENS_HREF,
    UNICODE_SECTIONS,
    unicodeHref,
  } from './unicode-sections';
  import {
    COMPARE_NATURAL,
    FILE_ENTRY,
    FOLD_LOOP,
    FOLD_PARTS,
    LANG_FONTS,
    MATCHABLE_TITLE,
    OCR_TEXT,
    QUOTE_CONTEXT,
    READINGS_PUT_AWAY,
    SAME_TAG_NAME,
    TAG_NAME,
    WITHOUT_READINGS,
  } from './unicode-snippets';
</script>

<DocsSection title={UNICODE_SECTIONS.boundary}>
  <p>
    A book's title in Dokseo usually starts as a file or folder name, and a file name is the one
    piece of text whose normalization nobody controls. I found a Korean title, read from a folder
    name on a Mac, that came through decomposed: its first syllable, <span lang="ko">나</span>, was
    the two jamo
    <code>U+1102 U+1161</code> instead of the one code point <code>U+B098</code> a keyboard types. It
    looked identical and matched nothing.
  </p>
  <p>
    So the adapter that turns a browser <code>File</code> into Dokseo's own values composes the name with
    NFC on the way in:
  </p>
  <DocsCode label={FILE_ENTRY.label} code={FILE_ENTRY.code} />
  <p>
    The upload's name and the title suggested from a file name are normalized the same way, in
    <code>uploadName</code> and in <code>open-file.ts</code>. NFC is safe for every language,
    because it only chooses between canonically equivalent spellings, so the adapter does not need
    to know the book's language, which it could not know from a file name anyway.
  </p>
  <p>
    The boundary uses NFC and never NFKC. A spec in <code>file-entry.spec.ts</code> checks that a
    file named <span lang="ja">①巻 ﬁnale Ａ.cbz</span> keeps all three compatibility characters. How
    the file name feeds a book's identity is on the book identity page, in
    <a href={IDENTITY_NAMES_HREF}>file names and titles as fallbacks</a>.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.titles}>
  <p>
    When an upload is matched against removed or unreadable books, the last step of
    <a href={IDENTITY_LADDER_HREF}>the matching ladder</a> compares titles. Both sides go through the
    same function first:
  </p>
  <DocsCode label={MATCHABLE_TITLE.label} code={MATCHABLE_TITLE.code} />
  <p>
    NFC, then trimming, and nothing more: no case folding and no width folding. A title is an
    identity key here, and a looser comparison would join two different books whose titles differ
    only in width or case. An empty title and the placeholder for an untitled book never match
    anything.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.search}>
  <p>
    Search is where Dokseo folds hard. The library's title search, the capture search, the tag
    filter and the quick find all call <code>matchesQuery</code> or <code>textMatches</code> in
    <code>shared/text-search.ts</code>, and both fold the text and the query with
    <code>foldForSearch</code> before an ordinary <code>indexOf</code>. The fold works one grapheme
    cluster at a time:
  </p>
  <DocsCode label={FOLD_PARTS.label} code={FOLD_PARTS.code} />
  <ul>
    <li>
      <strong>Width and compatibility.</strong> Each cluster goes through NFKC, so
      <span lang="ja">ｶﾞ</span>, <span lang="ja">ガ</span> and the decomposed
      <span lang="ja">カ</span> plus <code>U+3099</code> all become <span lang="ja">ガ</span>, and
      <span lang="ja">ＯＣＲ</span> becomes <code>OCR</code>. The spacing marks
      <span lang="ja">゛</span> and <span lang="ja">゜</span> are first swapped for the combining ones,
      because NFKC would turn them into a space and a mark.
    </li>
    <li><strong>Case.</strong> <code>toLowerCase()</code> on the result.</li>
    <li>
      <strong>Kana.</strong> Katakana from <code>U+30A1</code> to <code>U+30F6</code> shifts down by
      <code>0x60</code> onto the matching hiragana. The range stops at <span lang="ja">ヶ</span>.
      Past it are <span lang="ja">ヷ</span> to <span lang="ja">ヺ</span>, which have no hiragana,
      the middle dot, and <span lang="ja">ー</span>, which the shift would turn into
      <code>U+309C</code>, the spacing semi-voiced mark.
    </li>
    <li>
      <strong>Voiced marks.</strong> A combining mark left over after a fold is composed onto the kana
      before it with NFC, when a precomposed character exists.
    </li>
  </ul>
  <DocsCode label={FOLD_LOOP.label} code={FOLD_LOOP.code} />
  <p>
    The fold changes lengths in both directions: <span lang="ja">㌔</span> becomes two characters
    and
    <span lang="ja">ｶﾞ</span> becomes one. A match found in the folded text is a position in the
    folded text, and highlighting it in the original needs a map back. That is <code>origins</code>:
    for each UTF-16 unit of folded output, the offset of the cluster in the original that produced
    it. Units rather than code points, because <code>indexOf</code> returns a unit index.
  </p>
  <SearchFoldDemo />
  <p>
    Grapheme clusters are what made the Korean title above searchable. An earlier version folded one
    code point at a time, and NFKC on a lone jamo cannot compose it with the next one. A decomposed
    syllable is one cluster, so NFKC on the cluster composes it, and the cluster still has one
    offset in the original string for the highlight.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.tags}>
  <p>
    A tag's name is cleaned once, when it is created or renamed: trimmed, composed with NFC, and
    every run of whitespace inside it collapsed to one space. That cleaned name is what is stored
    and shown.
  </p>
  <DocsCode label={TAG_NAME.label} code={TAG_NAME.code} />
  <p>
    Whether two names are the same tag is a stricter question, because a duplicate is confusing. The
    answer is the search fold applied to both cleaned names:
  </p>
  <DocsCode label={SAME_TAG_NAME.label} code={SAME_TAG_NAME.code} />
  <p>
    So <code>Vocab</code> and <code>vocab</code> are one tag, and so are
    <span lang="ja">ﾀｸﾞ</span>, <span lang="ja">タグ</span> and <span lang="ja">たぐ</span>.
    Creating or renaming a tag to a name that is already taken in this sense is refused, and an
    import merges tags by the same test, as <a href={EXPORT_TAGS_HREF}>tags merged by name</a>
    describes. The last row of the <a href={unicodeHref('comparing')}>same-or-not demo</a> runs it.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.sorting}>
  <p>
    Page images inside an archive or a folder are ordered by name, and the order becomes the page
    index. Code-unit order puts <code>page10</code> before <code>page2</code>, so Dokseo sorts with
    a numeric collator:
  </p>
  <DocsCode label={COMPARE_NATURAL.label} code={COMPARE_NATURAL.code} />
  <p>
    <code>sensitivity: 'base'</code> ignores case, so <code>A.jpg</code> and <code>a.jpg</code>
    compare equal, and numeric collation calls <code>page02</code> and <code>page2</code> equal too. An
    archive can hold both, and a sort that returns 0 for two different names leaves their order to the
    input. The fallback to plain code-unit order makes the order total, so the same files always get the
    same page numbers.
  </p>
  <NaturalOrderDemo />
  <p>
    The library's sort by title uses the same collator options, with no tiebreak; there two equal
    titles only swap places on a shelf.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.offsets}>
  <p>
    A capture taken in the flow reader stores two things to find its passage again: an EPUB CFI and
    a text quote. The CFI's character offset counts UTF-16 code units, the same units as a DOM
    <code>Range</code> offset and a JavaScript <code>length</code>; the EPUB page explains the rest
    of the CFI in <a href={EPUB_CFI_HREF}>EPUB CFI, a position that survives reflow</a>.
  </p>
  <p>
    The quote is the selected text as <code>exact</code>, with up to 32 characters before and after
    it as <code>prefix</code> and <code>suffix</code>. The 32 are counted with
    <code>Array.from</code>, so in code points, and a cut never falls inside a surrogate pair:
  </p>
  <DocsCode label={QUOTE_CONTEXT.label} code={QUOTE_CONTEXT.code} />
  <p>
    All three strings leave the furigana out. Dokseo clones the selected range, removes its
    <code>rt</code> and <code>rp</code> elements, and reads the text that is left:
  </p>
  <DocsCode label={WITHOUT_READINGS.label} code={WITHOUT_READINGS.code} />
  <p>
    Finding the quote later searches the chapter's text with the same elements skipped, and compares
    code units with <code>indexOf</code>. Neither side is normalized; both come from the same book's
    markup. The search and the fallback order are on the EPUB page, in
    <a href={EPUB_ANCHORING_HREF}>how a capture anchors its text</a>.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.furigana}>
  <p>
    The flow reader's text settings include a switch labeled <strong>Furigana / Hanja</strong>, on
    by default. The label names both because Korean books can print readings over hanja with the
    same ruby markup, and the stored setting has a language-neutral name,
    <code>showPhoneticReadings</code>.
  </p>
  <p>
    Turning it off adds one rule to the styles Dokseo injects into each chapter, after the book's
    own stylesheets:
  </p>
  <DocsCode label={READINGS_PUT_AWAY.label} code={READINGS_PUT_AWAY.code} />
  <p>
    With <code>!important</code>, no rule in the book's own stylesheets can show the readings again.
    The readings stay in the document, so turning the switch back on needs no reload. Whatever the
    setting, <code>rt</code> is drawn at <code>0.6em</code>. How the styles reach the chapter frame
    is on the EPUB page, in <a href={EPUB_STYLES_HREF}>Dokseo's chapter styles</a>, and the live
    demo there, in <a href={EPUB_SETTINGS_HREF}>text size and furigana</a>, applies them to a sample
    book. How Dokseo decides that a book is vertical is in
    <a href={EPUB_PROBE_HREF}>finding a book's writing mode</a>.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.ocrText}>
  <p>
    Japanese captures are read by manga-ocr, whose tokenizer works one character at a time and puts
    a space between every pair when it turns token ids back into text: <span lang="ja"
      >こ ん に ち は</span
    >. The <a href={OCR_TOKENS_HREF}>model tokens</a> section of the OCR page shows why. The worker removes
    every run of whitespace before it posts the text back:
  </p>
  <DocsCode label={OCR_TEXT.label} code={OCR_TEXT.code} />
  <p>
    That is the only change. manga-ocr's own Python <code>post_process</code> also replaces
    <span lang="ja">…</span> and runs of <span lang="ja">・</span> with dots, then widens ASCII and
    digits to full width with <code>jaconv.h2z</code>; Dokseo keeps what the model produced. Width
    matters only for matching, and the search fold already handles it, so a half-width digit in a
    capture is still found by a full-width query.
  </p>
  <p>
    The strip runs in the manga-ocr worker only. Korean and English are read by a PaddleOCR model,
    whose words are separated by real spaces; its worker keeps them and joins the lines it reads
    with a newline. Either way, the recognizer adapter on the page trims the text before it becomes
    a capture, as the
    <a href={OCR_PIPELINE_HREF}>pipeline</a> on the OCR page shows.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.lang}>
  <p>
    Every book has a language, Japanese, Korean or English, chosen per book. Wherever Dokseo shows a
    book's own text, a title, a capture, a chapter name or the flow reader's view, the element gets
    <code>lang</code> set to that language. The base stylesheet gives each language its own font
    through <code>:lang()</code>:
  </p>
  <DocsCode label={LANG_FONTS.label} code={LANG_FONTS.code} />
  <p>
    <code>--font-ja</code> resolves to Hiragino Mincho ProN, then Yu Mincho, then the system serif,
    so a kanji in a Japanese title is drawn with a Japanese font even in an English interface, whose
    document is <code>lang="en"</code>.
  </p>
</DocsSection>

<DocsSection title={UNICODE_SECTIONS.rules}>
  <ul>
    <li>
      Compose text with NFC where it enters Dokseo from outside, and store it composed. Never store
      the result of NFKC.
    </li>
    <li>
      Compare names and search text through <code>foldForSearch</code>, which folds by grapheme
      cluster. Compare identity keys, such as titles in matching, with NFC and trimming only.
    </li>
    <li>
      Keep an offset that indexes a string in UTF-16 units, and count context or a visible length
      without splitting a surrogate pair.
    </li>
    <li>Leave <code>rt</code> and <code>rp</code> out of any text that is stored or searched.</li>
    <li>Undo only what decoding added to OCR output, and leave what the model read alone.</li>
    <li>Set <code>lang</code> from the book's language on every element that shows its text.</li>
  </ul>
</DocsSection>
