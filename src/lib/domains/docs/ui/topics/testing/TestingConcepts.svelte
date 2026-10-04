<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import DoublesDemo from './DoublesDemo.svelte';
  import MutationDemo from './MutationDemo.svelte';
  import RevertDemo from './RevertDemo.svelte';
  import SpecRunnerDemo from './SpecRunnerDemo.svelte';
  import { TEST_KINDS } from './testing-diagrams';
  import {
    ARCHITECTURE_PORTS_HREF,
    TESTING_SECTIONS,
    TOUCH_SETTINGS_HREF,
    TOUCH_ZONES_HREF,
    testingHref,
  } from './testing-sections';
  import {
    CREATE_TAG_DOUBLE,
    DECISION_OF,
    TURN_SPEC,
    TURN_SPEC_ASSERT,
    TURN_SPEC_CASE,
  } from './testing-snippets';
</script>

<DocsSection title={TESTING_SECTIONS.reach}>
  <p>
    A test takes a piece of the app's code, runs it somewhere other than the app, gives it inputs,
    and compares what comes back with a value written down in advance. Where it runs sets what it
    can reach, and that is the first choice to make about any test.
  </p>
  <StepList>
    <StepItem title="A unit test runs in plain Node">
      <p>
        Node has no page, no DOM and no layout. What it runs well is code that takes values and
        returns values: a function that works out which side of the page a tap landed on, a class
        that holds a screen's state, a component rendered to an HTML string on the server, a source
        file read as text. Each test takes milliseconds. On my machine the whole unit set, over five
        thousand tests, runs in about 13 seconds.
      </p>
    </StepItem>
    <StepItem title="A browser test runs in a real browser page">
      <p>
        The same test runner opens Chromium through Playwright and runs the test inside a page. Now
        a component can be mounted, an event dispatched on a real element, and an API used that Node
        does not have. Each test pays for a browser, and anything that waits on rendering or timers
        becomes sensitive to how busy the machine is.
      </p>
    </StepItem>
    <StepItem title="An end-to-end probe drives the built app">
      <p>
        A script starts a browser, opens the app as a person would, uploads a book, taps and
        scrolls, and reads the result. It can choose the engine (Chromium or WebKit), emulate touch
        input, slow the CPU down or cut the network. It is the slowest and the hardest to keep
        stable, and it still runs on a desktop.
      </p>
    </StepItem>
    <StepItem title="A real device">
      <p>
        Only Safari on an actual iPhone behaves exactly like Safari on an actual iPhone. Everything
        above approximates it.
      </p>
    </StepItem>
  </StepList>
  <Figure>
    <Diagram {...TEST_KINDS} />
    {#snippet caption()}
      What each kind of check can reach, and where it runs. A real phone sits past the right-hand
      column.
    {/snippet}
  </Figure>
  <p>
    Moving right buys reach and costs speed and stability. The useful habit is to push each piece of
    logic as far left as it can go, so that most of it is checked by the cheapest test, and to keep
    the expensive kinds for what only they can reach.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.expectation}>
  <p>
    A test has three parts: build the inputs, call the code, and compare the result with the value
    the author wrote down. When the comparison fails, the runner prints both values, the expected
    one and the one received, and marks the test failed.
  </p>
  <p>
    Many tests are a table of cases run through one assertion. Dokseo's
    <a href={TOUCH_SETTINGS_HREF}>page-turn settings</a> depend on which pointers a device reports
    through two media queries, and <code>shownTurnSettings</code> turns those results into the two
    settings the screen offers. Its spec builds a fake <code>matchMedia</code> from a list of queries
    that match:
  </p>
  <DocsCode label={TURN_SPEC.label} code={TURN_SPEC.code} />
  <DocsCode label={TURN_SPEC_CASE.label} code={TURN_SPEC_CASE.code} />
  <DocsCode label={TURN_SPEC_ASSERT.label} code={TURN_SPEC_ASSERT.code} />
  <p>
    The demo runs the same six rows against the real function. Change a row's media queries or its
    expected settings and the row fails, with the two values side by side.
  </p>
  <SpecRunnerDemo />
  <p>
    Breaking a test on purpose is worth doing once for every new test. A test that cannot fail, such
    as one whose assertion compares a value with itself or whose loop runs over an empty list,
    passes forever and checks nothing. Dokseo's Vitest config sets <code>requireAssertions</code>,
    so a test that makes no assertion at all fails instead of passing empty.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.doubles}>
  <p>
    Most code calls other code. A use case that creates a tag reads the stored tags and saves a new
    one, and the store is IndexedDB. A unit test cannot open IndexedDB in Node, and a real database
    would be the wrong tool anyway: slow, and keeping state from one test to the next. So the test
    passes in a stand-in, a <em>test double</em>.
  </p>
  <p>
    Gerard Meszaros named five kinds, and Martin Fowler's
    <a href="https://martinfowler.com/articles/mocksArentStubs.html">Mocks Aren't Stubs</a> repeats the
    list:
  </p>
  <StepList>
    <StepItem title="Dummy">
      <p>Passed to fill a parameter and never used.</p>
    </StepItem>
    <StepItem title="Stub">
      <p>Gives canned answers to the calls the test makes, and nothing else.</p>
    </StepItem>
    <StepItem title="Spy">
      <p>A stub that also records how it was called.</p>
    </StepItem>
    <StepItem title="Mock">
      <p>
        Programmed in advance with the calls it should receive; the test fails if the calls differ.
      </p>
    </StepItem>
    <StepItem title="Fake">
      <p>
        A working implementation with a shortcut that makes it unfit for production, such as a store
        that keeps everything in an array.
      </p>
    </StepItem>
  </StepList>
  <p>
    The split that matters is what the test checks afterwards. With a fake, the test checks the
    result and the state: after creating a tag, the store lists it. Fowler calls that state
    verification. With a mock, the test checks the conversation: <code>list</code> was called once,
    then <code>save</code> with this tag. That is behavior verification, and it ties the test to how the
    code does its job rather than to what the job produced.
  </p>
  <p>
    The demo runs the real <code>createTag</code> and two edited copies against both kinds. The refactor
    that reads the list twice behaves the same from outside, and only the mock test fails. The case-sensitive
    bug is caught by both, because both kinds include a case for it.
  </p>
  <DoublesDemo />
  <p>
    A fake has its own cost: it is code, and it is right only as far as it models the real thing. A
    fake store that keeps the saved object, instead of copying it the way IndexedDB does, accepts
    objects the browser's store rejects, and the test passes for code that fails in the app.
    Dokseo's unit project has a gap of the same kind, shown in
    <a href={testingHref('runes')}>Runes in the Node project</a>.
  </p>
  <p>
    Ports make doubles cheap. Each store is behind an interface in a domain's
    <code>domain/</code> folder (<a href={ARCHITECTURE_PORTS_HREF}>Ports and adapters</a>), so a
    double is an object literal typed as that interface, and <code>svelte-check</code>, which checks
    spec files too, fails if the double drifts from the port. Dokseo's own use case specs mostly use
    a stub that records what was saved, rather than a full fake:
  </p>
  <DocsCode label={CREATE_TAG_DOUBLE.label} code={CREATE_TAG_DOUBLE.code} />
  <p>
    Its tests then check the result and the <code>saved</code> array, which is state verification even
    though the double is not a full fake.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.regression}>
  <p>
    A bug report leads to a fix, and the fix should arrive with a test that would have caught the
    bug. That test is a <em>regression test</em>: if anyone brings the bug back, it fails. The catch
    is that a test written after the fix has only ever run against fixed code. It may pass because
    the fix works, or because its fixture never reaches the broken path, or because its assertion
    cannot fail.
  </p>
  <p>
    The only proof is to run it against the broken code and watch it fail. Undo the fix in the
    working copy, run the test, see it fail, and put the fix back. Or, when the bug is one wrong
    condition, change that condition back by hand. Either way the result to record is "this test
    fails without the fix, and passes with it".
  </p>
  <p>
    A case from Dokseo. Downloading an OCR model needs the reader's consent, and the consent was
    stored per language. A reader agreed to one model's download; later the default model changed to
    another publisher's, and the app downloaded 211 MB of new weights with no dialog. The fix
    records the model id with the consent, and a grant applies only to the same model:
  </p>
  <DocsCode label={DECISION_OF.label} code={DECISION_OF.code} />
  <p>
    The demo runs the spec's nine cases against the fix, against the rule before the fix, and
    against a fix that sounds reasonable and is wrong: show the consent dialog again only when the
    new model is larger.
  </p>
  <RevertDemo />
  <p>
    The size-only rule fails two cases because their fixtures replace a model with a smaller one. A
    regression test is stronger when its fixtures also rule out the plausible wrong fixes, not only
    the original bug.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.mutation}>
  <p>
    Proving one test against one bug scales poorly. <em>Mutation testing</em> addresses the general
    question: if this line were wrong, would any test notice? A tool makes a small change to the
    code, a <em>mutant</em>, such as <code>&lt;</code> to <code>&lt;=</code> or <code>===</code> to
    <code>!==</code>, and runs the tests. If a test fails, the mutant is <em>killed</em>. If none
    fails, it <em>survived</em>, and some behavior of that line is not checked by anything.
    <a href="https://stryker-mutator.io/docs/">StrykerJS</a> automates this for JavaScript.
  </p>
  <p>
    Dokseo has no mutation tool. I ran the changes below by hand on
    <code>tapZone</code>, the function that splits a page into tap zones of 30, 40 and 30 percent (<a
      href={TOUCH_ZONES_HREF}>Tap zones and swipe only</a
    >): apply one change to
    <code>page-turn.ts</code>, run the whole unit project, restore the file. The demo replays the
    three <code>tapZone</code> tests in the page and shows the recorded whole-project count for each change.
  </p>
  <MutationDemo />
  <p>
    Two mutants survive. On a 390 px frame the side zones end at 117 px and start again at 273 px.
    The spec checks 116 and 118, and 272 and 274, but not 117 or 273, so no test pins which zone
    those two pixels belong to. A surviving mutant is a question for the author, not automatically a
    missing test: here the answer may well be that one boundary pixel does not matter. A mutant that
    changes something a reader would notice, like the variant flip, is killed by twenty or more
    tests across six spec files, because every caller of <code>tapZone</code> has its own tests.
  </p>
  <p>
    The two survivors were not entirely unnoticed. A quoting test on the touch page failed for each,
    because that page quotes <code>tapZone</code> and checks the quote against the file. That test compares
    text, not behavior, and it fails on any edit to the quoted lines; the next section is about tests
    of that kind.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.drift}>
  <p>
    Some code exists as a copy: a snippet quoted in documentation, a rule list ported from a config
    file into a demo, a case table copied from a spec. Each copy goes stale the moment its source
    changes, and nothing in the app shows it. A <em>drift test</em> reads the source file and fails when
    the copy no longer matches.
  </p>
  <p>
    Every page under <code>/docs</code> has one. Each quoted snippet records the file it came from,
    and a spec reads that file and checks the quote is still in it, ignoring indentation. The
    architecture page's ported import rules are checked against
    <code>.dependency-cruiser.cjs</code>. The <code>tapZone</code> copy in the mutation demo must
    equal the real function's text and return the real function's results on a grid of inputs; the
    recorded case names must still appear in the real specs; and the compiler output in
    <a href={testingHref('runes')}>Runes in the Node project</a> is produced by compiling the module again
    inside the test.
  </p>
  <p>
    A drift test fails on harmless edits too, such as a rename or a reformatted line. That is
    intended: each failure is a prompt to update the copy, which takes a minute, instead of a page
    that shows code the app no longer has.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.flaky}>
  <p>
    A <em>flaky</em> test passes and fails on the same code. The usual causes are concrete:
  </p>
  <StepList>
    <StepItem title="Timing">
      <p>
        The test waits a fixed time for something to happen. On a fast machine the time is enough;
        on a slow or busy one the thing has not happened yet when the assertion runs.
      </p>
    </StepItem>
    <StepItem title="Load">
      <p>
        Every test has a timeout, 5 seconds by default in Vitest and 15 seconds in browser mode. A
        test that compiles or imports a lot can pass in a quarter of a second alone and cross the
        timeout when every core is busy.
      </p>
    </StepItem>
    <StepItem title="State left behind">
      <p>
        One test writes to something global, such as <code>localStorage</code>, and a later test
        reads it. The result depends on order, or on what an earlier run left on disk.
      </p>
    </StepItem>
  </StepList>
  <p>
    A real failure fails the same way every time on the same code. So the first steps after a
    surprising failure are to run the one file again alone, then the whole suite on an idle machine,
    and to read the exit code rather than search the log for a word. If the file passes alone and
    fails only under load, the code is probably fine and the test's timing is not. If it fails
    alone, it is a bug until shown otherwise.
  </p>
</DocsSection>
