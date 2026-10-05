<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DRIFT_SECTIONS, driftHref } from './drift-sections';
  import { DRIFT_SNIPPETS, LINK_CHECK } from './drift-snippets';
</script>

<DocsSection title={DRIFT_SECTIONS.limits}>
  <p>
    Every check above compares text or output with its source. The rest of a page is prose, and no
    test reads prose. A sentence about a quote can go stale while the quote passes:
  </p>
  <StepList>
    <StepItem title="The words change, the quoted lines do not">
      The decode loop stops at <code>MAX_TOKENS</code>, which is 300 today. If a sentence said the
      loop stops after 300 tokens, changing the constant would leave the quote valid, since the loop
      uses the name, and the sentence wrong.
    </StepItem>
    <StepItem title="A failure fixes only what it names">
      When the Unicode quote failed, its spec named the quote, not the sentence before it. That
      sentence changed by hand in the same commit as the quote, and no test asked for it (<a
        href={driftHref('moved')}>When the quoted file moves</a
      >).
    </StepItem>
  </StepList>
  <p>The quote check itself has gaps that follow from how it works:</p>
  <StepList>
    <StepItem title="Containment is not identity">
      A short quote can pass because the same lines occur somewhere else in the file. A quote of a
      closing brace proves nothing.
    </StepItem>
    <StepItem title="Only the snippets module is searched">
      The membership test sees what a page's snippets module exports. Code typed straight into a
      component has no file to compare with. The UI library page has one such example: two layers of
      made-up rules that explain the cascade, which quote nothing in Dokseo.
    </StepItem>
    <StepItem title="Recorded output that is not run again">
      The PostgreSQL results, the sizes of Dokseo's build and the recorded OCR run are checked for
      consistency, not produced again.
    </StepItem>
  </StepList>
  <p>
    Links between pages are the one part of the prose with a check of its own. A spec reads the
    source of every docs page, collects each link to <code>/docs</code>, and fails when a link names
    a topic or a section title that does not exist:
  </p>
  <DocsCode label={LINK_CHECK.label} code={LINK_CHECK.code} />
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.self}>
  <p>
    The quotes on this page follow the same pattern. All {DRIFT_SNIPPETS.length} of them live in
    <code>example-drift/drift-snippets.ts</code>, and its spec checks each one against its file. The
    code of <code>checkSnippets</code> above is one of them, so the page cannot show a check that differs
    from the one that runs.
  </p>
  <p>
    The recorded Vitest report is partly checked. Running a failing test inside a passing one would
    need a second Vitest run, so the spec rebuilds the parts that follow from the code instead. It
    takes today's decode loop quote, changes the one line back, runs the same assertion, and checks
    that the recorded report holds the message it throws. That message starts with the first
    characters of <code>ocr.worker.ts</code>, so a new first line in the worker fails this page's
    spec. It also reads the old path, and checks that the recorded report holds the error that read
    throws. The rest of the report, such as the line numbers in the diff, is recorded and not
    checked.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.rules}>
  <StepList>
    <StepItem title="Never type code into a page">
      Quote it into the page's snippets file with its label and its path from the repository root,
      and render it from there.
    </StepItem>
    <StepItem title="Quote consecutive lines exactly">
      Only the indentation may change. To show two places in a file, write two quotes.
    </StepItem>
    <StepItem title="List every quote">
      Add each constant to the array its spec runs over, in the same change. The spec fails while an
      exported quote is missing from it.
    </StepItem>
    <StepItem title="Record output with its input">
      Keep both as data, render both from it, and run the tool again in a spec when it can run in
      Node. When it cannot, check what follows from the code, and say on the page that the output is
      recorded.
    </StepItem>
    <StepItem title="Compute counts">
      A number in a sentence comes from the data it counts.
    </StepItem>
    <StepItem title="Fix the prose with the quote">
      When a drift spec fails, update the quote, then read every sentence around it again.
    </StepItem>
  </StepList>
</DocsSection>
