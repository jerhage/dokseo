<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import ProxyCloneDemo from './ProxyCloneDemo.svelte';
  import TestKindChooserDemo from './TestKindChooserDemo.svelte';
  import { VERIFY_LADDER } from './testing-diagrams';
  import {
    ARCHITECTURE_QUERIES_HREF,
    ARCHITECTURE_REHEARSAL_HREF,
    ARCHITECTURE_RULES_HREF,
    ARCHITECTURE_VIEW_MODELS_HREF,
    OFFLINE_TESTING_HREF,
    STORAGE_OPFS_HREF,
    TESTING_SECTIONS,
    UI_RULES_HREF,
    testingHref,
  } from './testing-sections';
  import {
    CI_STEP,
    CLIENT_EFFECT,
    CLIENT_OUTPUT,
    FRESH_LOCAL_STORAGE,
    IDLE_WRITE_QUERY,
    OBSERVED_READ,
    QUERY_SPEC,
    RUNE_MODULE,
    SERVER_OUTPUT,
    SOURCE_WALKER,
    STYLE_BLOCK_TEST,
    TOUCH_TURN_TAP,
    TOUCH_TURN_TEST,
    VERIFY_SCRIPTS,
    VITEST_PROJECTS,
    WRITE_QUERY_MOCK,
  } from './testing-snippets';
</script>

<DocsSection title={TESTING_SECTIONS.projects}>
  <p>
    Dokseo's tests run on <a href="https://vitest.dev/">Vitest</a>, configured in
    <code>vite.config.ts</code> as two <em>projects</em>, two sets of test files with their own
    environment, run together by one <code>vitest</code> command:
  </p>
  <DocsCode label={VITEST_PROJECTS.label} code={VITEST_PROJECTS.code} />
  <p>
    The file name selects the project, not what the file imports. A file ending in
    <code>.spec.ts</code> runs in the <code>unit</code> project, in plain Node. A file ending in
    <code>.svelte.spec.ts</code> is excluded from <code>unit</code> and runs in the
    <code>browser</code> project, inside headless Chromium driven by Playwright. Most of the suite is
    unit tests; at the time of writing the browser project holds a dozen files.
  </p>
  <p>
    The unit project's setup file runs before every test and replaces <code>localStorage</code> with an
    empty one in memory:
  </p>
  <DocsCode label={FRESH_LOCAL_STORAGE.label} code={FRESH_LOCAL_STORAGE.code} />
  <p>
    <a href={testingHref('lessons')}>Failures that changed the tests</a> gives the reason for that line.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.choosing}>
  <p>
    The written rule is short. A unit test is the default. A browser test is written only when a
    real bug has appeared that a unit test cannot reach by construction: component event wiring, the
    behavior of a DOM API, focus, or layout. Never speculatively, and never to raise coverage. A
    regression test must fail against the broken code before it counts.
  </p>
  <p>
    The reasons are the costs from <a href={testingHref('reach')}>What a test can reach</a>. A
    browser test is slower, needs Chromium installed, and is the kind most likely to become flaky;
    and CI does not run it at all (<a href={testingHref('ladder')}>The verify ladder</a>). A
    suspicion that some browser might mishandle focus produces a test that has never failed, so
    nobody knows whether it can.
  </p>
  <p>
    The browser test in <code>flow-touch-turn.svelte.spec.ts</code> is an example of one that earned
    its place. In the EPUB reader, a finger tap that turned past the end of a chapter left every
    later tap doing nothing. foliate-js, the EPUB renderer, also snaps the page on every
    <code>touchend</code>; after a turn into the next chapter, that snap started a second navigation
    beside the turn, the turn never finished, and foliate ignores every turn while one is
    unfinished. The bug lived in which events reached which listener, so the test opens a real book
    in a real page and taps with synthetic touch and pointer events:
  </p>
  <DocsCode label={TOUCH_TURN_TAP.label} code={TOUCH_TURN_TAP.code} />
  <DocsCode label={TOUCH_TURN_TEST.label} code={TOUCH_TURN_TEST.code} />
  <p>
    Before the fix went in, the test was run five times against the old reader and failed all five.
    The logic beside it, which release counts as a turn and when a <code>touchend</code> is claimed, has
    unit tests of its own.
  </p>
  <TestKindChooserDemo />
</DocsSection>

<DocsSection title={TESTING_SECTIONS.names}>
  <p>
    Vitest prints a failure as the <code>describe</code> name followed by the <code>it</code> name,
    so test names read as sentences about the subject: "tapZone answers the centre for a frame it
    cannot divide", "booksQuery orders the newest upload first". Dokseo's convention is that the
    <code>it</code> name starts with a verb in the third person that states what the subject does: "passes",
    "rejects", "orders", "reports", "stores nothing".
  </p>
  <p>
    The alternatives read worse when they fail. "a chosen file reaches the library" names a scene,
    not a claim. "choosing nothing" names an action with no outcome. "is valid" states nothing about
    valid for what. A failed "rejects a draft that is only whitespace" names exactly which promise
    broke. No tool enforces this; it holds by review.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.viewModels}>
  <p>
    The rules above have a consequence for where code lives. A <code>.svelte</code> component runs
    only in a browser, so logic inside one can only be tested by a browser test, which the rules
    allow only after a bug. Logic in a <code>*.svelte.ts</code> file, a class holding
    <code>$state</code>
    and
    <code>$derived</code>, runs in Node. So anything worth a test moves out of the component into a
    view model, and the component keeps the markup and the event handlers that call the view model.
    <a href={ARCHITECTURE_VIEW_MODELS_HREF}>View models in .svelte.ts files</a> shows the pattern and
    one of its tests.
  </p>
  <p>
    One naming detail follows from the projects. A view model <code>tag-picker.svelte.ts</code> is
    tested by <code>tag-picker.spec.ts</code>. Naming the spec
    <code>tag-picker.svelte.spec.ts</code> would not mark it as a test of a Svelte file; it would move
    it into the browser project.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.runes}>
  <p>
    Runes work in the unit project, but not the way they work in the app. Node has no DOM, so the
    unit project's environment is <code>node</code>, and the Svelte plugin compiles every
    <code>.svelte.ts</code> file for the server there. Here is one small module compiled both ways by
    the installed Svelte compiler (a unit test compiles it again and checks this output):
  </p>
  <CodeBlock code={RUNE_MODULE} label="plan.svelte.ts" />
  <CodeBlock code={SERVER_OUTPUT} label="Compiled for the server, as the unit project runs it" />
  <CodeBlock
    code={`${CLIENT_OUTPUT}\n…\n${CLIENT_EFFECT}`}
    label="Compiled for the client, as the app runs it"
  />
  <p>
    The server build drops the <code>$effect.root</code> call entirely, and <code>$state([])</code>
    becomes a plain array. Two things follow.
  </p>
  <StepList>
    <StepItem title="Effects never run in a unit test">
      <p>
        Code inside <code>$effect</code> is absent from the unit project. Dokseo prefers event handlers
        and callbacks to effects partly for this reason: a handler is a method a test can call.
      </p>
    </StepItem>
    <StepItem title="State is never a proxy in a unit test">
      <p>
        In the app, <code>$state</code> wraps objects and arrays in a <code>Proxy</code> so it can
        track deep changes. A proxy cannot be structured-cloned, and IndexedDB stores values by
        structured cloning. An import screen kept its import plan in deep <code>$state</code> and
        handed it to a write; in the browser, IndexedDB's <code>put</code> failed with "could not be
        cloned". Every unit test of that screen passed, because in Node the plan was a plain object.
        The fix keeps immutable domain data in <code>$state.raw</code>, which does not proxy.
      </p>
    </StepItem>
  </StepList>
  <ProxyCloneDemo />
  <p>
    The view model behind this demo has a unit test, and in Node it records the opposite of what the
    first button shows here: the direct clone succeeds. That test passes for the reason the bug was
    missed.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.queries}>
  <p>
    Screens read and write through TanStack Query (<a href={ARCHITECTURE_QUERIES_HREF}
      >Reads and writes through TanStack Query</a
    >), wrapped in Dokseo's <code>readQuery</code> and <code>writeQuery</code>. Both call TanStack's
    Svelte functions, which need a component: <code>useQueryClient</code> reads Svelte context, and
    <code>createMutation</code> subscribes inside an effect, which the unit project never runs. So the
    unit tests go one layer down, to the plain classes TanStack builds those on.
  </p>
  <p>
    A query factory is tested through a <code>QueryObserver</code>, the class
    <code>createQuery</code>
    wraps.
    <code>observedRead</code> subscribes one, waits for the fetch to settle, and resolves with the
    same
    <code>ReadState</code> a data component would draw:
  </p>
  <DocsCode label={OBSERVED_READ.label} code={OBSERVED_READ.code} />
  <DocsCode label={QUERY_SPEC.label} code={QUERY_SPEC.code} />
  <p>
    A view model that builds a write in its constructor cannot be built in a plain test at all, so
    its spec replaces the module that holds <code>writeQuery</code>. <code>vi.mock</code> is hoisted to
    the top of the file, so every import in that spec receives the stand-in:
  </p>
  <DocsCode label={WRITE_QUERY_MOCK.label} code={WRITE_QUERY_MOCK.code} />
  <DocsCode label={IDLE_WRITE_QUERY.label} code={IDLE_WRITE_QUERY.code} />
  <p>
    <code>shared/testing/</code> holds three stand-ins: an idle one whose run never settles, one
    that rejects every run and records its variables, and one that runs the real mutation options
    through a <code>MutationObserver</code>. Each spec picks the one whose behavior it needs. The
    use cases underneath are tested separately with doubles of their ports, as in
    <a href={ARCHITECTURE_REHEARSAL_HREF}>A use case with a fake port</a>.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.source}>
  <p>
    Some rules are about the source itself: no Svelte file has a <code>&lt;style&gt;</code> block, every
    class the markup writes is defined in a stylesheet, design-system internals appear only in the design-system
    folders. The docs pages are exempt from the first and the last, so that they can quote CSS as it is
    written. Neither the type checker nor the linter states rules like these, but a unit test can: list
    the files, read each as text, and collect the offenders.
  </p>
  <DocsCode label={SOURCE_WALKER.label} code={SOURCE_WALKER.code} />
  <DocsCode label={STYLE_BLOCK_TEST.label} code={STYLE_BLOCK_TEST.code} />
  <p>
    Four specs work this way: <code>design-system.spec.ts</code>,
    <code>source-styling.spec.ts</code>,
    <code>markup-classes.spec.ts</code> and <code>classes.spec.ts</code>.
    <a href={UI_RULES_HREF}>Rules the tests enforce</a> lists what each one checks. Asserting
    <code>toEqual([])</code> on a list of offenders has a practical benefit: a failure prints every offending
    file, not only the first.
  </p>
  <p>
    Text checks are approximate. A regular expression over markup is not a Svelte parser, so
    <code>markup-classes.spec.ts</code> starts with a case that feeds its matcher a known sample,
    and a regex that silently stops matching fails that case. Import rules are the same idea at a
    larger scale, and they get a real tool: dependency-cruiser builds the import graph and checks
    every edge in
    <code>verify:static</code> (<a href={ARCHITECTURE_RULES_HREF}
      >The rules in .dependency-cruiser.cjs</a
    >).
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.ladder}>
  <p>
    The checks run as one command per level, each level running the one below it first and stopping
    at the first failure:
  </p>
  <DocsCode label={VERIFY_SCRIPTS.label} code={VERIFY_SCRIPTS.code} />
  <Figure>
    <Diagram {...VERIFY_LADDER} />
    {#snippet caption()}
      Each rung runs only if the one above it passed. CI takes its own path: the static checks, the
      unit project alone, and the build.
    {/snippet}
  </Figure>
  <p>
    <code>verify:static</code> runs <code>svelte-check</code> (types, including every spec file),
    oxlint, oxfmt in check mode, and dependency-cruiser. <code>verify:tests</code> adds both test
    projects.
    <code>verify</code> adds the production build. Locally, I run <code>verify:tests</code> while
    working and the full <code>verify</code> once before a commit. The project's tasks run through
    Deno, so the commands are <code>deno task verify</code> and so on.
  </p>
  <DocsCode label={CI_STEP.label} code={CI_STEP.code} />
  <p>
    CI runs <code>verify:ci</code>, which skips the browser project and installs no Chromium. I made
    that call after a browser test failed on the GitHub runner, whose slower CPU let a page turn
    outlast the test's fixed wait (<a href={testingHref('lessons')}
      >Failures that changed the tests</a
    >). The cost is accepted: a change that breaks only a browser test passes CI, and only a local
    <code>verify</code> catches it.
  </p>
</DocsSection>

<DocsSection title={TESTING_SECTIONS.probes}>
  <p>
    A probe is a Playwright script kept outside the test suite. It starts a browser against
    <code>vite dev</code> or a preview of the built app, does what a reader does, and prints what it measured.
    Probes are written for one question and thrown away or kept as notes, because they are too slow and
    too dependent on the machine to run on every change. What they reach that the browser project does
    not:
  </p>
  <StepList>
    <StepItem title="WebKit">
      <p>
        Playwright ships a WebKit build, the engine behind Safari. A plain
        <code>webkit.launch()</code> context could not write to the origin private file system (<code
          >UnknownError</code
        >), so WebKit probes use <code>launchPersistentContext</code> with a temporary profile (<a
          href={STORAGE_OPFS_HREF}>The origin private file system</a
        >).
      </p>
    </StepItem>
    <StepItem title="Real touch input">
      <p>
        A Chrome DevTools Protocol session, Chromium only, can send
        <code>Input.dispatchTouchEvent</code>, which produces a touch drag the browser handles as a
        real one. WebKit has no CDP, so WebKit probes dispatch synthetic <code>PointerEvent</code>s
        on the element instead.
      </p>
    </StepItem>
    <StepItem title="A slow phone">
      <p>
        <code>Emulation.setCPUThrottlingRate</code> slows the page's main thread. A desktop Chromium loads
        one slice of a long image strip in about 10 ms and shows no problem; at 6x or 10x the phone's
        problems appear.
      </p>
    </StepItem>
    <StepItem title="Pointers and offline">
      <p>
        With <code>hasTouch</code> and <code>isMobile</code>, Playwright reports a touch-only device
        to the pointer media queries; without them, a mouse-only one. Neither setting reports a
        device with both. Offline is subtler than one switch, and
        <a href={OFFLINE_TESTING_HREF}>Testing offline</a> covers the differences.
      </p>
    </StepItem>
  </StepList>
  <p>
    Probes still run on a desktop. Two bugs occurred only in WebKit and were found only after a
    deploy: pdf.js calling <code>Map.prototype.getOrInsertComputed</code>, and a capture sheet that
    kept its open height after it was hidden. Since then the dev server can serve over HTTPS on the
    local network, so a phone on the same Wi-Fi opens the dev build as a secure, cross-origin
    isolated page before anything is deployed.
  </p>
</DocsSection>
