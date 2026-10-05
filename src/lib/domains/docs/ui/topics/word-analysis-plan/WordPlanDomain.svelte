<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { ANALYZER_OPTIONS } from './plan-facts';
  import { WORD_PIPELINE } from './plan-diagrams';
  import {
    ARCHITECTURE_GRAPH_HREF,
    ARCHITECTURE_LANGUAGES_HREF,
    ARCHITECTURE_PORTS_HREF,
    ARCHITECTURE_ROOT_HREF,
    OCR_CAPTURE_HREF,
    WORD_PLAN_SECTIONS,
    wordPlanHref,
  } from './plan-sections';

  const PLANNED_FILES = `src/lib/domains/lexicon/
  domain/word.ts
  domain/word-analyzer.ts
  domain/dictionary.ts
  use-cases/analyze-text.ts
  use-cases/   install, remove and status of a dictionary
  adapters/ja/
  adapters/ko/
src/lib/composition/lexicon.ts   wordAnalyzerFor, dictionaryFor`;
</script>

<DocsSection title={WORD_PLAN_SECTIONS.pipeline}>
  <p>
    Today Dokseo's recognition pipeline ends at a stored capture: a selection on the page is
    cropped, the crop goes through OCR, and the recognized text is saved with the image index and
    the rectangle it came from (<a href={OCR_CAPTURE_HREF}>What a capture stores</a>). The capture
    card shows that text as one paragraph with its <code>lang</code> attribute set.
  </p>
  <p>
    The plan adds steps after that, at display time, and leaves the capture as it is. The analyzer
    runs first, because the dictionary needs the base form: <span lang="ja">上れば</span> is found
    only once it is reduced to <span lang="ja">上る</span>.
  </p>
  <Figure>
    <Diagram {...WORD_PIPELINE} />
    {#snippet caption()}
      The planned path from a capture's text to a reading line and a dictionary popover. The capture
      record gains no field.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.domain}>
  <p>
    The work goes in a new domain called <code>lexicon</code>, a leaf like
    <code>recognition</code>: it imports no other domain, and the route composes its UI into the
    capture panel by passing a snippet, so <code>recognition</code> does not import it either (<a
      href={ARCHITECTURE_GRAPH_HREF}>Dokseo's domain graph</a
    >). Its two ports are <code>WordAnalyzer</code>, which turns text into <code>Word</code>s, and
    <code>Dictionary</code>, which looks a base form up. Following
    <a href={ARCHITECTURE_PORTS_HREF}>ports and adapters</a>, the ports are named for the need and
    the adapters for the library behind them.
  </p>
  <DocsCode label="Planned files" code={PLANNED_FILES} />
  <p>
    The adapters sit in folders named <code>ja</code> and <code>ko</code>, because Japanese terms
    are allowed only inside a Japanese adapter. A port, a use case and the <code>Word</code> value
    use language-neutral names such as <code>phoneticReading</code>, so the Korean adapter fits the
    same port without a rename.
  </p>
  <p>
    Dokseo 1.0 has no <code>lexicon</code> domain, and no empty port waiting for one.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.composition}>
  <p>
    A book carries its language, and recognition already picks an OCR model from it: the
    <a href={ARCHITECTURE_ROOT_HREF}>composition root</a> has a <code>recognizerFor(language)</code>
    that reads which OCR model is chosen for the language and loads that model's adapter through a dynamic
    import (<a href={ARCHITECTURE_LANGUAGES_HREF}>Recognizers loaded per language</a>). The plan
    adds
    <code>wordAnalyzerFor</code> and <code>dictionaryFor</code> beside it, in
    <code>composition/lexicon.ts</code>, resolved the same way.
  </p>
  <p>
    The use case receives the analyzer and dictionary for the book's language and never branches on
    the language itself. Each language's adapter is a separate dynamic import, so a Japanese reader
    never downloads the Korean code, and a reader with the feature off downloads neither.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.analyzer}>
  <p>The candidates for Japanese, as checked in October 2026:</p>
  <Table size="sm" caption="Japanese analyzers that run in a browser">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Analyzer</TableHeaderCell>
        <TableHeaderCell>Built as</TableHeaderCell>
        <TableHeaderCell>License</TableHeaderCell>
        <TableHeaderCell>Activity</TableHeaderCell>
        <TableHeaderCell>Dictionaries</TableHeaderCell>
        <TableHeaderCell>Languages</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each ANALYZER_OPTIONS as option (option.name)}
        <TableRow>
          <TableCell>{option.name}</TableCell>
          <TableCell>{option.form}</TableCell>
          <TableCell>{option.license}</TableCell>
          <TableCell>{option.activity}</TableCell>
          <TableCell>{option.dictionaries}</TableCell>
          <TableCell>{option.languages}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The plan is Lindera with IPADIC. Lindera is maintained, and one WebAssembly runtime covers both
    Japanese and Korean, with the dictionary chosen when it is loaded. Its IPADIC archive is 10.5
    MB, small enough to host alongside Dokseo (<a href={wordPlanHref('downloads')}
      >Downloads, consent and storage</a
    >).
  </p>
  <p>
    kuromoji.js was the analyzer named in the first sketch of this feature, and it is the simplest
    to add: pure JavaScript with IPADIC bundled. It has had no release since 2018 and covers
    Japanese only, so Korean would need a second, unrelated library. Sudachi's dictionary is
    Apache-2.0, but it has no official WebAssembly build, and at about 71 MB the dictionary is too
    large for one file on Dokseo's host. UniDic, which Lindera can also load, is 46.4 MB zipped and
    too large for the same reason.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.japaneseDictionary}>
  <p>
    For meanings, the plan is JMdict through jmdict-simplified, version 3.6.2 when checked. The
    common-only English edition is a 1.44 MB zip and comes first; the full English edition, an 11.5
    MB zip, follows. The common edition holds only the entries JMdict marks as common, for about an
    eighth of the download.
  </p>
  <p>
    Using JMdict means an attribution screen that names JMdict and the EDRDG and links to the
    license, as <a href={wordPlanHref('licenses')}>Dictionary licenses and attribution</a> describes.
    An index built from it and distributed with Dokseo is CC BY-SA as well.
  </p>
  <p>
    Later, the reader will be able to import a dictionary ZIP in Yomitan's format, the format
    Jitendex is published in. Jitendex, a richer JMdict-based dictionary, is a 37 MB zip: too large
    to host as one file, and a reader who wants it can import their own copy.
  </p>
</DocsSection>

<DocsSection title={WORD_PLAN_SECTIONS.koreanParts}>
  <p>
    The Korean analyzer is Lindera again, with ko-dic, Lindera's build of mecab-ko-dic, a 19.9 MB
    zip. The plan made it conditional on confirming the data license. The <code>COPYING</code> file
    in the mecab-ko-dic repository is the Apache License 2.0, and the <code>NOTICE.txt</code> in Lindera's
    archive reproduces it.
  </p>
  <p>
    For meanings, the plan is the Basic Korean Dictionary (KRDict) from the National Institute of
    Korean Language, from its full data dump, about 84 MB zipped, preprocessed into a compact index.
    KRDict also has an online API, which needs a key and a network connection for every lookup; a
    preprocessed index needs neither, so lookups work offline, like OCR once its model is
    downloaded.
  </p>
</DocsSection>
