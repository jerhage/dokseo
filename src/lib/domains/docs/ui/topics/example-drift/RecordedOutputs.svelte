<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    BUILD_OUTPUT_HREF,
    BUILD_SHAKING_HREF,
    DRIFT_SECTIONS,
    OCR_GREEDY_HREF,
    SQL_JOINS_HREF,
    TESTING_RUNES_HREF,
    TYPES_EXHAUSTIVE_HREF,
  } from './drift-sections';
  import {
    BUILD_TOTALS,
    COUNT_IN_MARKUP,
    OCR_RUN_END,
    ROLLDOWN_BUILD,
    ROLLDOWN_COMPARE,
    SQL_ENGINE,
    SQL_RERUN,
    SVELTE_COMPILE,
    SVELTE_SERVER,
    TSC_COMPARE,
    TSC_PRINT,
  } from './drift-snippets';
  import { RECORDED_COUNTS } from './recorded-counts';
</script>

<DocsSection title={DRIFT_SECTIONS.recorded}>
  <p>
    Some pages show what a tool printed rather than code from the repository: the rows a query
    returned, the errors <code>tsc</code> reported, the JavaScript a bundler wrote. Output drifts too.
    A new version of the tool, or a change to its input, makes the shown output wrong, and nothing reports
    it.
  </p>
  <p>
    A quote check does not fit, because no file holds the output to compare with. The answer is the
    same idea one step further: keep the input and the recorded output together as data, have the
    page render both from that data, and run the tool again inside a unit test to compare its output
    with the recording. Where the tool cannot run in a unit test, the test checks what it can.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.sql}>
  <p>
    The <a href={SQL_JOINS_HREF}>SQL pages</a> show {RECORDED_COUNTS.sqlite +
      RECORDED_COUNTS.postgres}
    queries with their results. Each example keeps its query text, its column names, its rows and the
    engine that produced them. The spec builds the sample tables in an in-memory database with
    <code>node:sqlite</code>, the SQLite module built into Node, so it needs no package. It keeps
    the SQLite examples:
  </p>
  <DocsCode label={SQL_ENGINE.label} code={SQL_ENGINE.code} />
  <p>
    and runs each of the {RECORDED_COUNTS.sqlite} again, comparing the column names and the rows:
  </p>
  <DocsCode label={SQL_RERUN.label} code={SQL_RERUN.code} />
  <p>
    The other {RECORDED_COUNTS.postgres} examples show PostgreSQL output that SQLite cannot produce:
    <code>DISTINCT ON</code>, <code>generate_series</code> and four query plans. They are recorded from
    a PostgreSQL server and are not run again, since no database server runs during the tests.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.tsc}>
  <p>
    The TypeScript page shows {RECORDED_COUNTS.compiled} small programs, each with the errors the compiler
    printed for it, such as the ones in
    <a href={TYPES_EXHAUSTIVE_HREF}>Exhaustive checks with never and match</a>. The spec compiles
    every program again with the installed <code>typescript</code> package, through its compiler API,
    with each program's own flags. It formats the diagnostics the way the command line does:
  </p>
  <DocsCode label={TSC_PRINT.label} code={TSC_PRINT.code} />
  <p>and compares the text with the recording, for every program at once:</p>
  <DocsCode label={TSC_COMPARE.label} code={TSC_COMPARE.code} />
  <p>
    A program that should compile records an empty string, so a program that starts to fail is
    caught too. A TypeScript upgrade that rewords a message fails this spec until the recording
    holds the new wording.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.svelte}>
  <p>
    The testing page shows what the Svelte compiler makes of a small module that uses runes, once
    for the server and once for the browser (<a href={TESTING_RUNES_HREF}
      >Runes in the Node project</a
    >). The module's source is a string in the quote file, and the spec compiles that string again
    with the installed <code>svelte/compiler</code>:
  </p>
  <DocsCode label={SVELTE_COMPILE.label} code={SVELTE_COMPILE.code} />
  <p>
    It checks that the output shown on the page is part of what the compiler returns, and that the
    server output has no effect and no proxy in it:
  </p>
  <DocsCode label={SVELTE_SERVER.label} code={SVELTE_SERVER.code} />
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.rolldown}>
  <p>
    The production builds page shows {RECORDED_COUNTS.bundles} small bundles, from an unused export to
    a minified chunk (<a href={BUILD_SHAKING_HREF}>Tree shaking</a>). Each sample keeps its input
    files and every chunk Vite produced from them. The spec builds each sample again with the
    installed Vite, which bundles with Rolldown, in memory and with <code>NODE_ENV</code> set to
    <code>production</code>:
  </p>
  <DocsCode label={ROLLDOWN_BUILD.label} code={ROLLDOWN_BUILD.code} />
  <p>and compares every chunk's file name and code with the recording:</p>
  <DocsCode label={ROLLDOWN_COMPARE.label} code={ROLLDOWN_COMPARE.code} />
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.build}>
  <p>
    The same page shows <a href={BUILD_OUTPUT_HREF}>Dokseo's own build</a>, measured once: the total
    size, the files in each output folder and the precache, with and without the plugin that leaves
    the dev-only routes out. A full build is too slow for a unit test, so the sizes are not measured
    again. The spec checks what it can without building:
  </p>
  <DocsCode label={BUILD_TOTALS.label} code={BUILD_TOTALS.code} />
  <p>
    It also checks that the number of files recorded from <code>static/</code>, and the number of
    them in the precache, match <code>static/</code> today. So adding a file to
    <code>static/</code> or a dev-only route fails the spec. A change that makes a chunk bigger does not;
    those sizes stay true only for the build they were measured on.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.ocrRun}>
  <p>
    The OCR page steps through one real run of the manga-ocr model on a sample speech bubble: each
    token it chose, the other likely candidates, and their log probabilities (<a
      href={OCR_GREEDY_HREF}>Greedy decoding</a
    >). Running the model again needs its weights and a browser worker, so no test repeats the run.
    The specs check that the recording is consistent with itself and with the page:
  </p>
  <DocsCode label={OCR_RUN_END.label} code={OCR_RUN_END.code} />
  <p>
    Others check that the decoded text is the chosen tokens joined, and that the crop the run read
    has the size of the sample page's region. A different model version would produce different
    tokens and still pass every one of these checks.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.counts}>
  <p>
    A count in a sentence is a small piece of recorded output. The numbers above, such as the
    {RECORDED_COUNTS.sqlite} SQLite queries, are not typed into the page. The page computes each one from
    the same array the spec runs over, so adding an example changes the sentence. The OCR page does the
    same with the length of its recorded run:
  </p>
  <DocsCode label={COUNT_IN_MARKUP.label} code={COUNT_IN_MARKUP.code} />
</DocsSection>
