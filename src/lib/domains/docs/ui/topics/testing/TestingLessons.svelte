<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    EPUB_LOCK_HREF,
    OFFLINE_TESTING_HREF,
    TESTING_SECTIONS,
    testingHref,
  } from './testing-sections';
  import { RECOGNIZERS_SPEC, SETTLES } from './testing-snippets';
</script>

<DocsSection title={TESTING_SECTIONS.lessons}>
  <p>
    Each of these started as a red run that looked like a bug in the app. Most were not, and the
    difference is what changed how the tests are written and run.
  </p>
  <StepList>
    <StepItem title="A page turn that outlasted a fixed wait">
      <p>The touch-turn browser test taps, then waits a fixed time before it checks the page:</p>
      <DocsCode label={SETTLES.label} code={SETTLES.code} />
      <p>
        foliate-js holds its <a href={EPUB_LOCK_HREF}>turn lock</a> for the whole chapter load plus
        100 ms. On my machine that fits inside 400 ms. On the GitHub runner both tests failed.
        Locally, with the CPU throttled ten times through the DevTools protocol, both failed the
        same way, so the failure was timing on a slow machine, not a regression. CI has run no
        browser tests since; the test still runs in every local <code>verify</code>.
      </p>
    </StepItem>
    <StepItem title="A timeout under load">
      <p>This test imports both OCR adapters for the first time:</p>
      <DocsCode label={RECOGNIZERS_SPEC.label} code={RECOGNIZERS_SPEC.code} />
      <p>
        With other builds and browsers running on the machine, it crossed Vitest's 5 second timeout
        and the full run exited 1. Alone it passed in 223 ms, and the full run passed again on a
        idle machine. Earlier, a full run of both projects under the same kind of load timed out
        specs in files nobody had touched, while the unit project alone passed. A timeout in a file
        that imports a lot, on a busy machine, is load until a re-run on an idle machine fails the
        same way.
      </p>
    </StepItem>
    <StepItem title="A folder named like a spec">
      <p>
        A failing browser test makes Vitest write a screenshot into
        <code>__screenshots__/&lt;spec file name&gt;/</code>, a folder whose name ends in
        <code>.svelte.spec.ts</code>. A recursive <code>readdirSync</code> lists folders as well as
        files, so the source-reading specs, which filtered by file name ending, tried to read that
        folder and failed with <code>EISDIR</code>. One browser failure turned into failures in
        unrelated unit specs. The walkers now list entries with <code>withFileTypes: true</code> and
        keep only <code>entry.isFile()</code>, as in
        <a href={testingHref('source')}>Specs that read the source</a>.
      </p>
    </StepItem>
    <StepItem title="localStorage that outlived the run">
      <p>
        <code>deno task</code> ran Vitest inside Deno, and Deno gives every script a
        <code>localStorage</code> that persists on disk between runs. Run through Node, the same
        tests had no <code>localStorage</code> at all. An earlier run had left a sort order saved,
        so every test that built the capture list without its own store saw the newest-first order
        under <code>deno task</code> and passed when run through Node. The fix is the setup file in
        <a href={testingHref('projects')}>Vitest's two projects</a>: a fresh in-memory
        <code>localStorage</code> before every test, so no test can read what another left. The scripts
        now run through npm, in Node, and the setup file stays.
      </p>
    </StepItem>
    <StepItem title="Offline is not one switch">
      <p>
        Offline support passed every probe that used Playwright's <code>setOffline</code>, and
        failed when tested with DevTools' network throttling set to Offline: the two are different
        mechanisms, and only one of them reproduced the failure. A result is evidence only for the
        method that produced it, so a reproduction uses the exact method the failure was seen with.
        The details are in
        <a href={OFFLINE_TESTING_HREF}>Testing offline</a>.
      </p>
    </StepItem>
    <StepItem title="The first browser run after a new dependency">
      <p>
        The first browser run that imported TanStack's Svelte package failed with Svelte's
        <code>effect_orphan</code> error: Vite was still discovering and pre-bundling the new dependency,
        and the page ran two copies of Svelte. The second run, with the same files, passed. A browser
        failure right after a dependency change gets one more run before anyone reads the code.
      </p>
    </StepItem>
  </StepList>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.rule}>
  <StepList>
    <StepItem title="Write a unit test by default">
      <p>
        Put logic in pure functions and <code>*.svelte.ts</code> view models, and test it in Node.
        Name the spec <code>name.spec.ts</code>, never <code>name.svelte.spec.ts</code>.
      </p>
    </StepItem>
    <StepItem title="Write a browser test only for a real bug">
      <p>
        Only when the bug has happened and lives where Node cannot go: event wiring, a DOM API's own
        behavior, focus, layout. Never on a suspicion, never for coverage.
      </p>
    </StepItem>
    <StepItem title="See every new test fail">
      <p>
        A regression test runs against the broken code first, by undoing the fix or changing the
        condition back, and the result is written down. Fixtures should also rule out the plausible
        wrong fixes.
      </p>
    </StepItem>
    <StepItem title="Prefer state to calls">
      <p>
        Give a use case a double of its port and check what it returned and what the double holds,
        not the order of the calls it made.
      </p>
    </StepItem>
    <StepItem title="Name what the subject does">
      <p>Start the test name with a third-person verb: passes, rejects, orders, reports.</p>
    </StepItem>
    <StepItem title="Tie every copy to its source">
      <p>A quoted or ported piece of code gets a drift test that reads the original.</p>
    </StepItem>
    <StepItem title="Re-run before investigating a timeout">
      <p>
        Run the file alone, then the suite on an idle machine, and judge by the exit code. Test on a
        phone what only a phone can show.
      </p>
    </StepItem>
  </StepList>
</DocsSection>
