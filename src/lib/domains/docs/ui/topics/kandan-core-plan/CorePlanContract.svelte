<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import ContractCheckDemo from './ContractCheckDemo.svelte';
  import { contractCase } from './contract-cases';
  import { CONTRACT_FLOW, CORE_CHAIN } from './core-diagrams';
  import {
    ACCORDION_RENDER,
    BADGE_RENDER,
    BUTTON_RENDER,
    CONTRACT_FAILURE,
    PLAIN_PAGE_RUN,
    POPOVER_RENDER,
  } from './core-runs';
  import { FONT_URL, LAYER_IMPORTS, MODAL_SHOW, TAB_BUTTON, TAB_KEYS } from './core-snippets';
  import {
    DRIFT_CHECK_HREF,
    DRIFT_RECORDED_HREF,
    KANDAN_CORE_SECTIONS,
    kandanCoreHref,
  } from './core-sections';
</script>

<DocsSection title={KANDAN_CORE_SECTIONS.core}>
  <p>The core, <code>kandan-ui</code>, holds the parts no framework owns:</p>
  <ul>
    <li><code>styles/</code>: the layered CSS, tokens, themes and component classes.</li>
    <li><code>fonts/</code>: the font files with their licenses.</li>
    <li><code>icons/</code>: one SVG file per icon, with Lucide's license.</li>
    <li>
      The appearance contract in plain JavaScript: <code>THEMES</code>, the <code>data-theme</code>
      and
      <code>data-color-scheme</code> attributes, <code>applyAppearance</code>,
      <code>readAppearance</code> and <code>themeBootScript</code>.
    </li>
    <li><code>fixtures/</code>: the markup contract, one HTML file per component and variant.</li>
    <li>Its own specs, a static playground page, and its own guide.</li>
  </ul>
  <Figure>
    <Diagram {...CORE_CHAIN} />
    {#snippet caption()}
      The planned chain. The Svelte version vendors the core at <code>core/</code>; Dokseo still
      vendors only the Svelte version, and receives the core inside it.
    {/snippet}
  </Figure>
  <p>
    The stylesheets already work as plain files. They reach each other with relative
    <code>@import</code> statements and name the fonts by URLs relative to themselves, which a browser
    resolves without a bundler:
  </p>
  <DocsCode label={LAYER_IMPORTS.label} code={LAYER_IMPORTS.code} />
  <DocsCode label={FONT_URL.label} code={FONT_URL.code} />
  <p>
    I checked that with no build at all: a plain HTML file with <code>data-theme="ember"</code>, the
    library folder beside it, a link to <code>styles/index.css</code>, and the badge, button and
    accordion markup from the fixtures, served by Python's static file server and opened in
    Chromium:
  </p>
  <DocsCode label={PLAIN_PAGE_RUN.label} code={PLAIN_PAGE_RUN.code} />
  <p>
    Ninety-six stylesheet requests is a lot on a slow connection, so a plain site may still bundle
    them, but the files work without that step.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.fixtures}>
  <p>
    A fixture is one HTML file for one component in one variant: every element, class, attribute and
    ARIA state the component writes, with sample text where the caller's content goes. A button in
    its primary small variant, and the same component given an <code>href</code>, which makes it a
    link:
  </p>
  <DocsCode label="Button, primary, small" code={contractCase('button-primary').fixture} />
  <DocsCode label="Button with an href" code={contractCase('button-link').fixture} />
  <p>
    Every Kandan icon inside a component is part of its fixture too. The accordion item's fixture
    holds the chevron's whole <code>svg</code>:
  </p>
  <DocsCode label="Accordion item" code={contractCase('accordion').fixture} />
  <p>
    Generated ids need care. Kandan's popover takes an id from Svelte's <code>$props.id()</code>
    and gives its trigger that id as <code>popovertarget</code>. Rendered twice on the server, it
    wrote the same id both times,
    <code>s1</code>, but that name comes from Svelte; another framework writes another one. A
    fixture therefore cannot spell out the id, only that the trigger's <code>popovertarget</code>
    equals the sheet's
    <code>id</code>:
  </p>
  <DocsCode label={POPOVER_RENDER.label} code={POPOVER_RENDER.code} />
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.spec}>
  <p>
    The contract spec lives in each framework's repository. For each fixture it renders the
    framework's component with the props of that variant and compares the two.
  </p>
  <Figure>
    <Diagram {...CONTRACT_FLOW} />
    {#snippet caption()}
      Both sides pass through the same normalizer before they are compared.
    {/snippet}
  </Figure>
  <p>
    Svelte renders a component to a string with <code>render</code> from <code>svelte/server</code>,
    and the call works in Node inside Dokseo's unit project. What it returns is not the fixture yet:
  </p>
  <DocsCode label={BUTTON_RENDER.label} code={BUTTON_RENDER.code} />
  <DocsCode label={BADGE_RENDER.label} code={BADGE_RENDER.code} />
  <DocsCode label={ACCORDION_RENDER.label} code={ACCORDION_RENDER.code} />
  <p>
    The comments such as <code>&lt;!--[--&gt;</code> and <code>&lt;!----&gt;</code> mark blocks for
    hydration, the step where Svelte takes over server-rendered HTML in the browser. The icon's
    <code>path</code> gets an end tag, where a hand-written fixture would close it with
    <code>/&gt;</code>. And attribute order follows the component's source. So before comparing,
    both sides go through one normalizer that:
  </p>
  <ol>
    <li>removes comments,</li>
    <li>writes a self-closing element with an end tag,</li>
    <li>drops white space next to a tag and collapses the rest to one space,</li>
    <li>sorts each tag's attributes by name and the names inside a <code>class</code>,</li>
    <li>gives an attribute written without a value an empty value.</li>
  </ol>
  <p>
    To see a failure, I changed one case to render the warning badge against the success badge's
    fixture. The spec named both sides:
  </p>
  <DocsCode label={CONTRACT_FAILURE.label} code={CONTRACT_FAILURE.code} />
  <p>
    The five cases in the demo below are held to their fixtures by the same kind of spec, and the
    outputs above are rendered again by a spec that fails if Svelte starts writing something else (<a
      href={DRIFT_RECORDED_HREF}>Recorded output</a
    >). The normalizer has limits worth knowing. It is a few regular expressions, not an HTML
    parser, so an attribute value holding <code>&gt;</code> would break it. And because it drops
    white space next to tags on both sides, it cannot tell <code>Details &lt;svg</code> from
    <code>Details&lt;svg</code>.
  </p>
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.check}>
  <p>
    The same comparison, run in the browser against the real Kandan components. Pick a component,
    change the fixture, and run the check. Reformatting the first tag still matches; dropping a
    class or adding an attribute does not.
  </p>
  <ContractCheckDemo />
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
    A fixture can show the tabs with the second one selected. It cannot show that ArrowRight got
    them there. That part is a rule, written beside the fixture as states before and after a key:
  </p>
  <ul>
    <li>
      With the first tab selected and focused, ArrowRight selects the second, focuses it, and gives
      it <code>aria-selected="true"</code> and <code>tabindex="0"</code>; the first tab gets
      <code>tabindex="-1"</code>.
    </li>
    <li>Home and End select the first and the last enabled tab.</li>
    <li>In right-to-left text, ArrowRight and ArrowLeft swap.</li>
  </ul>
  <DocsCode label={TAB_KEYS.label} code={TAB_KEYS.code} />
  <p>
    Each framework then has a unit spec per rule. In the Svelte version the key mapping already has
    one, <code>roving.spec.ts</code>, and the same rules describe what the plain version's tabs
    module has to do. Native elements shrink the list: the accordion needs no rule at all, and the
    modal's rules start after <code>showModal()</code>, because inertness and Escape come from the
    browser:
  </p>
  <DocsCode label={MODAL_SHOW.label} code={MODAL_SHOW.code} />
</DocsSection>

<DocsSection title={KANDAN_CORE_SECTIONS.plain}>
  <p>
    The plain version is the core itself: the stylesheet, the fixtures, small JavaScript modules for
    the components that need a script, and a static playground page that shows every fixture. A
    plain page links <code>styles/index.css</code>, copies a fixture's markup, and imports a module
    where the component needs one. The fixtures are what both versions share, so a markup change in
    the core shows up in two places: the plain page, and a failing contract spec in the Svelte
    version until its component matches again.
  </p>
  <p>
    How the modules are packaged is still open (<a href={kandanCoreHref('open')}>Open decisions</a
    >).
  </p>
</DocsSection>
