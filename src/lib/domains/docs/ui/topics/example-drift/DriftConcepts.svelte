<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DRIFT_SECTIONS, TESTING_DRIFT_HREF, driftHref } from './drift-sections';
  import { QUOTE_FLOW } from './drift-diagrams';
  import {
    DEMO_UNINDENTED,
    EXPORTED_SNIPPETS,
    QUOTED_SOURCE,
    QUOTE_ENTRY,
    QUOTE_RENDERED,
    SNIPPET_CHECKS,
    SNIPPET_SPEC,
    SNIPPET_TYPE,
  } from './drift-snippets';
  import QuoteCheckDemo from './QuoteCheckDemo.svelte';
</script>

<DocsSection title={DRIFT_SECTIONS.stale}>
  <p>
    A page that explains code shows pieces of that code. The quick way to get a piece onto the page
    is to copy it in by hand. The copy is right on the day it is made, and then the code moves on
    without it:
  </p>
  <StepList>
    <StepItem title="A function is renamed">
      I rename <code>japaneseOcrText</code> to <code>jaOcrText</code> and move it into
      <code>src/workers/ja-ocr-text.ts</code>, beside the manga-ocr worker that calls it. The app
      builds and its tests pass.
    </StepItem>
    <StepItem title="The copy keeps the old name">
      A hand-made copy of the worker's decode loop on the OCR page still ends in
      <code>return japaneseOcrText(decoded);</code>. Nothing compiles that text, so nothing fails.
    </StepItem>
    <StepItem title="A reader follows the page">
      They search the repository for <code>japaneseOcrText</code>, find nothing, and cannot tell
      whether the page or the code is wrong.
    </StepItem>
  </StepList>
  <p>
    That gap between a copy and its source is <em>drift</em>. It produces no error anywhere, which
    is why it lasts. The general idea of a drift test, a test that reads the original and fails when
    a copy no longer matches it, is on the <a href={TESTING_DRIFT_HREF}>testing page</a>. Dokseo's
    docs pages apply it to every code example they show, in the steps below.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.quote}>
  <p>
    The fix has two halves. Keep each example as data that records where it came from, and run a
    test that compares the data with that place. In Dokseo an example is a <em>quote</em>, a value
    of one small type:
  </p>
  <DocsCode label={SNIPPET_TYPE.label} code={SNIPPET_TYPE.code} />
  <p>
    <code>label</code> is the caption above the code block. <code>file</code> is the path of the
    source file, from the repository root. <code>code</code> is the quoted text, copied exactly. Here
    is the function from the story above, as it is in its file:
  </p>
  <DocsCode label={QUOTED_SOURCE.label} code={QUOTED_SOURCE.code} />
  <p>And here is the Unicode page's quote of it:</p>
  <DocsCode label={QUOTE_ENTRY.label} code={QUOTE_ENTRY.code} />
  <p>
    The backslash is doubled because the quote is a template literal, where <code>\\</code> stands for
    one backslash. The string holds the same characters as the file.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.list}>
  <p>
    Each page that quotes code keeps its quotes in one file beside its sections, named after the
    page: <code>ocr-snippets.ts</code>, <code>unicode-snippets.ts</code> and so on. The file defines
    every quote as a named constant and exports them, plus one array that lists them all, such as
    <code>OCR_SNIPPETS</code>
    or <code>UNICODE_SNIPPETS</code>.
  </p>
  <p>
    The page writes no code into its own markup. A section imports a quote by name and passes it to
    <code>DocsCode</code>, the docs wrapper around the code block component:
  </p>
  <DocsCode label={QUOTE_RENDERED.label} code={QUOTE_RENDERED.code} />
  <p>
    So the text a reader sees and the text the test checks are one string. The array is what the
    test runs over, so a constant that the page renders but the array leaves out would never be
    checked. A second test, described below, fails when there is such a constant.
  </p>
  <Figure>
    <Diagram {...QUOTE_FLOW} />
    {#snippet caption()}
      The page and the spec import the same list. Only the spec reads the source file.
    {/snippet}
  </Figure>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.check}>
  <p>
    Beside each list sits a spec with the same name plus <code>.spec.ts</code>. This is the OCR
    page's, whole:
  </p>
  <DocsCode label={SNIPPET_SPEC.label} code={SNIPPET_SPEC.code} />
  <p>
    Every page's spec makes the same one call, with its own title, its own array and its whole
    module. <code>checkSnippets</code> registers the tests:
  </p>
  <DocsCode label={SNIPPET_CHECKS.label} code={SNIPPET_CHECKS.code} />
  <p>
    <code>it.each</code> turns the array into one test per quote, named after its label, so a
    failure names the quote. Each test reads the file with Node's <code>readFileSync</code> and
    asserts that its text contains the quote. The path is resolved against the working directory,
    and Vitest runs from the repository root, which is why <code>file</code> starts there.
  </p>
  <p>
    The assertion is <code>toContain</code> on two strings, so it checks that the quote occurs, not where.
    A quote can come from anywhere in the file, and its first and last lines may be part of a longer line.
    The quoted lines must be consecutive: there is no way to leave lines out in the middle of a quote.
  </p>
  <p>
    The last test checks the array itself. <code>import * as quotes</code> gives the spec the module
    as one object with a property for every export. Any exported value with a string
    <code>label</code>, <code>file</code> and <code>code</code> counts as a quote, and so does any such
    value inside an exported array. A quote that is not in the array fails the test, and the failure lists
    its label:
  </p>
  <DocsCode label={EXPORTED_SNIPPETS.label} code={EXPORTED_SNIPPETS.code} />
  <p>
    <code>includes</code> compares objects by identity, so a second object with the same text as a listed
    quote still counts as left out.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.indentation}>
  <p>
    <code>unindented</code> removes the leading whitespace of every line, and the spec applies it to both
    the file and the quote before it compares them. Indentation is the one thing a quote has to change.
    The decode loop on the OCR page is a method of an object that a function returns, indented four spaces
    in its file, and on the page it starts at the left margin. Comparing with the indentation removed
    lets the quote shift its lines left while every other character stays as in the file.
  </p>
  <p>
    It also means a formatter run that only reindents the source leaves every quote valid. Only
    leading whitespace is ignored: a space at the end of a line, a renamed identifier, a blank line
    added or removed, or a line left out all fail the check.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.demo}>
  <p>
    The demo runs the same check in the browser, on two real quotes and their real source files. The
    buttons apply one edit each to the quote; the text area takes any other. It removes indentation
    with the same <code>unindented</code> the specs import, from the same file, and that function is
    itself a quote on this page (<a href={driftHref('self')}>The quotes on this page</a>):
  </p>
  <DocsCode label={DEMO_UNINDENTED.label} code={DEMO_UNINDENTED.code} />
  <QuoteCheckDemo />
</DocsSection>
