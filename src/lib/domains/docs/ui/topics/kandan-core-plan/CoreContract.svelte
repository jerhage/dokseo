<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { TESTING_PROJECTS_HREF } from '../vendored-ui/vendored-sections';
  import ContractCheckDemo from './ContractCheckDemo.svelte';
  import { CONTRACT_FLOW, CORE_CHAIN } from './core-diagrams';
  import {
    COMPONENTS,
    CORE_TEST_FILES,
    FIXTURE_COUNT,
    RULE_COUNT,
    RULE_FILE_COUNT,
    UNCERTAIN_RULE_COUNT,
  } from './core-inventory';
  import {
    ACCORDION_RENDER,
    BADGE_RENDER,
    BUTTON_RENDER,
    CONTRACT_FAILURE,
    CORE_MISMATCH,
  } from './core-runs';
  import {
    ACCORDION_FIXTURE,
    ADD_FIXTURE_STEP,
    CASE_ROW,
    CASE_SNIPPET,
    COMPARE_MARKUP,
    CONTRACT_SPEC,
    CORE_TEST_SCRIPT,
    DOKSEO_BROWSER_EXCLUDE,
    DOKSEO_UNIT_EXCLUDE,
    FONT_URL,
    ID_ATTRIBUTES,
    LAYER_IMPORTS,
    LIBRARY_CI,
    LIBRARY_CORE_SCRIPTS,
    LIBRARY_VERIFY,
    MODAL_SHOW,
    POPOVER_FIXTURE,
    TAB_BUTTON,
    TAB_KEYS,
    TAB_RULE,
    UNCERTAIN_TODO,
  } from './core-snippets';
  import {
    DRIFT_CHECK_HREF,
    DRIFT_RECORDED_HREF,
    KANDAN_CORE_SECTIONS,
    kandanCoreHref,
  } from './core-sections';
</script>

<DocsSection title={KANDAN_CORE_SECTIONS.core}>
  <p>
    The core, <code>kandan-ui</code>, is a repository of its own. It holds only the parts no
    framework touches, and no component behavior:
  </p>
  <ul>
    <li><code>styles/</code>: the layered CSS, tokens, themes and component classes.</li>
    <li><code>fonts/</code>: the font files with their licenses.</li>
    <li><code>icons/</code>: one SVG file per icon, with Lucide's license.</li>
    <li>
      The small appearance script: <code>THEMES</code>, the <code>data-theme</code> and
      <code>data-color-scheme</code> attributes, <code>applyAppearance</code>,
      <code>readAppearance</code> and <code>themeBootScript</code>, with the narrow-screen query and
      the tag colors beside it, in plain JavaScript.
    </li>
    <li>
      <code>fixtures/</code>: the markup contract, one HTML file per component and variant ({FIXTURE_COUNT}
      files).
    </li>
    <li>
      <code>rules/</code>: the behavior rules with their ARIA states, {RULE_COUNT} of them in
      {RULE_FILE_COUNT} files.
    </li>
    <li><code>contract/</code>: the normalizer and the comparison every framework version uses.</li>
    <li>
      Its own specs, which run with Node's own test runner, its own guide, and an MIT license.
    </li>
  </ul>
  <p>
    Every component behavior, from a focus move to a pointer drag, lives in a framework version.
    <code>kandan-ui-svelte</code> vendors the core at <code>core/</code> with git subtree, and
    <code>kandan-ui-vanilla</code> will vendor it the same way after 1.0. An app vendors one framework
    version and receives the core inside it.
  </p>
  <Figure>
    <Diagram {...CORE_CHAIN} />
    {#snippet caption()}
      The chain. Each framework version vendors the core at <code>core/</code>; Dokseo vendors only
      the Svelte version, and receives the core inside it.
    {/snippet}
  </Figure>
  <p>
    The stylesheets work as plain files. They reach each other with relative <code>@import</code>
    statements and name the fonts by URLs relative to themselves, which a browser resolves without a bundler
    (<a href={kandanCoreHref('findings')}>What the trial runs found</a>):
  </p>
  <DocsCode label={LAYER_IMPORTS.label} code={LAYER_IMPORTS.code} />
  <DocsCode label={FONT_URL.label} code={FONT_URL.code} />
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.fixtures}>
  <p>
    A fixture is the HTML one component writes for one variant, before any script runs, at
    <code>fixtures/&lt;component&gt;/&lt;variant&gt;.html</code>. The core holds {FIXTURE_COUNT} of them
    in {COMPONENTS.length} folders, one folder per component. Each is written in one fixed form: attributes
    sorted by name, class names sorted, one tag or text per line. A diff of a fixture is then a diff of
    the contract and nothing else. The accordion item, closed:
  </p>
  <DocsCode label={ACCORDION_FIXTURE.label} code={ACCORDION_FIXTURE.code} />
  <p>The fixtures serve several readers at once:</p>
  <ul>
    <li>
      <strong>The specification of each variant's HTML.</strong> Every element, class, attribute and ARIA
      state is written down, so "what does a closed accordion item look like in the DOM" has one answer
      outside any framework. The stylesheets are written against it, and a core spec fails when a fixture
      names a class no stylesheet defines.
    </li>
    <li>
      <strong>A reference when building a component.</strong> Writing Kandan's accordion item in another
      framework starts from the fixture: the component is done when it writes that HTML for that variant.
    </li>
    <li>
      <strong>The target of each framework's contract spec.</strong> Each framework version renders
      every variant and compares it with the fixture (<a href={kandanCoreHref('spec')}
        >The contract spec in kandan-ui-svelte</a
      >).
    </li>
    <li>
      <strong>Plain markup for a page with no framework.</strong> A page that links the stylesheet
      and pastes a fixture gets the component's look, and for the accordion item its behavior too,
      since a <code>details</code> element opens with no script.
    </li>
    <li>
      <strong>Where a markup change starts.</strong> Changing what a component writes means changing its
      fixture in the core first. Each framework version's contract spec then fails until its component
      writes the new HTML, so no version can keep the old markup by accident.
    </li>
  </ul>
  <p>A fixture is never written by hand from nothing. The core's guide says how one is made:</p>
  <DocsCode label={ADD_FIXTURE_STEP.label} code={ADD_FIXTURE_STEP.code} />
  <p>
    <code>fixtureText</code> writes the fixed form. A change to an existing fixture is a new major version
    of the core, since every framework version has to change with it.
  </p>
  <p>
    Generated ids need care. A popover's trigger names the sheet's id in
    <code>popovertarget</code>, but the id itself comes from the framework, and another framework
    writes another one. So a fixture writes placeholders, <code>id-1</code> and <code>id-2</code>,
    numbered in order of first appearance:
  </p>
  <DocsCode label={POPOVER_FIXTURE.label} code={POPOVER_FIXTURE.code} />
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.normalize}>
  <p>
    Svelte renders a component to a string with <code>render</code> from <code>svelte/server</code>,
    and the call works in Node. What it returns is not a fixture yet:
  </p>
  <DocsCode label={BUTTON_RENDER.label} code={BUTTON_RENDER.code} />
  <DocsCode label={BADGE_RENDER.label} code={BADGE_RENDER.code} />
  <DocsCode label={ACCORDION_RENDER.label} code={ACCORDION_RENDER.code} />
  <p>
    The comments such as <code>&lt;!--[--&gt;</code> and <code>&lt;!----&gt;</code> mark blocks for
    hydration, the step where Svelte takes over server-rendered HTML in the browser. The icon's
    <code>path</code> gets an end tag, where a hand-written file would close it with
    <code>/&gt;</code>. And attribute order follows the component's source. None of that changes
    what a person gets on screen, so before comparing, both sides go through one normalizer,
    <code>contract/normalize.js</code> in the core. It:
  </p>
  <ol>
    <li>removes comments,</li>
    <li>
      writes a self-closing element with an end tag, and a void element such as <code>img</code> without
      one,
    </li>
    <li>drops white space next to a tag and collapses the rest to one space,</li>
    <li>
      sorts each tag's attributes by name, the names inside a <code>class</code> and the
      declarations inside a <code>style</code>,
    </li>
    <li>drops an empty <code>class</code> or <code>style</code>,</li>
    <li>
      reads unquoted and single-quoted values, and gives an attribute written without a value an
      empty one,
    </li>
    <li>
      renames every distinct id to a placeholder in order of first appearance, in these attributes
      and in an SVG <code>url(#…)</code> reference.
    </li>
  </ol>
  <DocsCode label={ID_ATTRIBUTES.label} code={ID_ATTRIBUTES.code} />
  <p>
    Two attributes that named the same id still name the same placeholder after the rename, so the
    check still holds the trigger and the sheet to one id.
  </p>
  <Figure>
    <Diagram {...CONTRACT_FLOW} />
    {#snippet caption()}
      Both sides pass through the same normalizer before they are compared.
    {/snippet}
  </Figure>
  <p>
    <code>compareMarkup</code> in <code>contract/compare.js</code> normalizes and formats both sides the
    same way, then compares them:
  </p>
  <DocsCode label={COMPARE_MARKUP.label} code={COMPARE_MARKUP.code} />
  <p>
    On a mismatch the result also holds the first line that differs and a message naming both sides.
    Given Kandan's warning badge against the success badge's fixture:
  </p>
  <DocsCode label={CORE_MISMATCH.label} code={CORE_MISMATCH.code} />
  <p>
    The outputs above are rendered again by a spec that fails if Svelte starts writing something
    else (<a href={DRIFT_RECORDED_HREF}>Recorded output</a>). The normalizer has limits worth
    knowing. It is regular expressions, not an HTML parser, so an attribute value holding
    <code>&gt;</code> would break it. And because it drops white space next to tags on both sides,
    it cannot tell <code>Details &lt;svg</code> from <code>Details&lt;svg</code>: the contract does
    not cover the space between inline text and an element.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.spec}>
  <p>
    The contract spec lives in each framework version's repository, so each version runs it against
    the same fixtures. In <code>kandan-ui-svelte</code>, every fixture has a row in
    <code>contract/cases.ts</code> that names a snippet in <code>contract/CaseMarkup.svelte</code>:
  </p>
  <DocsCode label={CASE_ROW.label} code={CASE_ROW.code} />
  <DocsCode label={CASE_SNIPPET.label} code={CASE_SNIPPET.code} />
  <p>
    Writing each case as Svelte markup, not as a props object, lets the type check cover the props
    every case passes. <code>contract/contract.spec.ts</code> renders each case on the server and compares
    it with its fixture:
  </p>
  <DocsCode label={CONTRACT_SPEC.label} code={CONTRACT_SPEC.code} />
  <p>
    A second test in the same file fails when a fixture has no case or a case no fixture, so a new
    fixture pulled from the core fails until a component renders it. The spec runs in the library's
    unit project, which is plain Node, and in Dokseo's too, since Dokseo's unit project picks up the
    vendored library's specs along with its own.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.check}>
  <p>
    The same idea, run in this browser against the real Kandan components. The demo mounts the
    component with Svelte's <code>mount</code>, reads its HTML, and compares it with an editable
    fixture through a shorter normalizer written for this page. It removes comments, writes a
    self-closing element with an end tag, drops white space next to tags, sorts attributes and class
    names, and gives a valueless attribute an empty value. Pick a component, change the fixture, and
    run the check. Reformatting the first tag still matches; dropping a class or adding an attribute
    does not.
  </p>
  <ContractCheckDemo />
  <p>
    This page holds the demo's five cases to their fixtures with a spec of its own. When I changed
    one case to render the warning badge against the success badge's fixture, it named both sides:
  </p>
  <DocsCode label={CONTRACT_FAILURE.label} code={CONTRACT_FAILURE.code} />
  <p>
    The idea is the same as a quote check on a code example (<a href={DRIFT_CHECK_HREF}
      >The check: is the quote still in the file</a
    >): a file outside the code says what the code does, and a test fails when they part.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.rules}>
  <p>
    A fixture shows a state, not how the component got there. Kandan's tabs write their ARIA state
    on each tab button:
  </p>
  <DocsCode label={TAB_BUTTON.label} code={TAB_BUTTON.code} />
  <p>
    A fixture can show the tabs with one tab selected. It cannot show that ArrowRight moved the
    selection there. That part is a rule. The core writes the rules as JSON in
    <code>rules/</code>, one file per component that runs a script or relies on a native element:
    the fixture a rule starts from, any state given on top of it, the events, and the state after.
  </p>
  <DocsCode label={TAB_RULE.label} code={TAB_RULE.code} />
  <p>
    The rule goes on to say that the second tab is then selected and focused, with
    <code>aria-selected="true"</code> and <code>tabindex="0"</code>, and the first has
    <code>tabindex="-1"</code>. Each rule also names where the behavior lives in the Svelte version,
    and the Svelte version's tab keys are a plain table:
  </p>
  <DocsCode label={TAB_KEYS.label} code={TAB_KEYS.code} />
  <p>
    Because the rules are data, every framework version runs the same files. The core cannot run
    them itself: it holds no components. In <code>kandan-ui-svelte</code>,
    <code>contract/rules.svelte.spec.ts</code> mounts a subject for the rule's starting fixture as a
    real component in Chromium, applies the given state, fires the events, and checks what follows.
    Keys, clicks and pointer presses reach Chromium as trusted input, so the browser runs its own
    default actions. A rule the core marks as not certain becomes a todo ({UNCERTAIN_RULE_COUNT}
    of the {RULE_COUNT} today), and so does a rule the runner cannot produce honestly, such as the drop
    effect of a drag the browser itself runs:
  </p>
  <DocsCode label={UNCERTAIN_TODO.label} code={UNCERTAIN_TODO.code} />
  <p>
    That browser project lives in its own Vitest config, outside the library's
    <code>test</code> and <code>verify</code>, so neither starts a browser (<a
      href={TESTING_PROJECTS_HREF}>Vitest's two projects</a
    >). It runs by hand and in the library's CI, after <code>verify</code>:
  </p>
  <DocsCode label={LIBRARY_CI.label} code={LIBRARY_CI.code} />
  <p>
    A unit spec, <code>contract/rule-subjects.spec.ts</code>, checks the part that needs no browser:
    every fixture a rule starts from has a subject, and each subject renders as its fixture. Native
    elements shrink the list of rules. The accordion's rules only check that its
    <code>details</code> opens and closes, and the modal's rules start after
    <code>showModal()</code>, because inertness and Escape come from the browser:
  </p>
  <DocsCode label={MODAL_SHOW.label} code={MODAL_SHOW.code} />
  <p>
    Dokseo's browser project leaves the whole library out, so the rules run only in the library's
    repository:
  </p>
  <DocsCode label={DOKSEO_BROWSER_EXCLUDE.label} code={DOKSEO_BROWSER_EXCLUDE.code} />
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.coreChecks}>
  <p>
    The core checks itself with Node alone: no package at run time, no browser, no framework. Its
    test script is Node's own test runner, which finds every <code>*.test.js</code> file, and its type
    check reads the JSDoc types:
  </p>
  <DocsCode label={CORE_TEST_SCRIPT.label} code={CORE_TEST_SCRIPT.code} />
  <p>Its {CORE_TEST_FILES.length} test files check:</p>
  <ul>
    <li>
      <code>appearance.test.js</code> and <code>theme-boot.test.js</code>: the appearance functions,
      the first-paint script's behavior and exact text, and that <code>THEMES</code> matches the theme
      stylesheets.
    </li>
    <li>
      <code>contract/</code>: the normalizer, the formatter and the comparison, three files.
    </li>
    <li>
      <code>fixtures/fixtures.test.js</code>: every fixture sits at a valid path, is in the fixed
      form, is balanced, uses only placeholder ids, and names only classes the stylesheets define.
    </li>
    <li>
      <code>rules/rules.test.js</code>: every rules file is well formed, names a fixture that
      exists, starts from elements its fixture holds, and explains every uncertain rule.
    </li>
    <li>
      <code>icons/icons.test.js</code>: every icon is one SVG with the expected attributes, and the
      license is present.
    </li>
    <li>
      <code>styles/</code>: the stylesheet rules (layers, tokens, themes, component classes,
      utilities, breakpoints), two files.
    </li>
    <li><code>library-files.test.js</code>: the file walker the other specs use.</li>
  </ul>
  <p>
    <code>kandan-ui-svelte</code> runs the same files over its vendored copy, as one step of its
    <code>verify</code>:
  </p>
  <DocsCode label={LIBRARY_CORE_SCRIPTS.label} code={LIBRARY_CORE_SCRIPTS.code} />
  <DocsCode label={LIBRARY_VERIFY.label} code={LIBRARY_VERIFY.code} />
  <p>
    Dokseo does not. Its unit project leaves the core out, because its files are
    <code>node --test</code> specs, not Vitest ones, and they are checked where the core is edited:
  </p>
  <DocsCode label={DOKSEO_UNIT_EXCLUDE.label} code={DOKSEO_UNIT_EXCLUDE.code} />
</DocsSection>
