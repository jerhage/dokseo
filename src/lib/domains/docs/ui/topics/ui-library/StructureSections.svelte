<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DIRECTION_DIAGRAM } from './diagrams';
  import { UI_LIBRARY_SECTIONS } from './sections';
  import { PRIMITIVE_NAMES } from './snippets';
  import ShellWidthDemo from './ShellWidthDemo.svelte';

  const SHELL = `.layout-app-shell {
  container: app-shell / inline-size;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
}
@container app-shell (max-width: 48rem) {
  .layout-app-shell-nav {
    grid-column: 1 / -1;
    grid-row: 2;
    flex-direction: row;
  }
}`;

  const RULE = `{
  name: 'base-components-know-no-app',
  severity: 'error',
  from: { path: '^src/lib/ui/' },
  to: {
    path: ['^src/', '(^|/)node_modules/'],
    pathNot: ['^src/lib/ui/', '(^|/)node_modules/(svelte|ts-pattern|vitest)/'],
  },
}`;
</script>

<DocsSection title={UI_LIBRARY_SECTIONS.containers}>
  <p>
    A media query tests the viewport. A container query tests the size of an ancestor that has
    declared itself a container, with <code>container-type</code> or the
    <code>container</code> shorthand. A component that sits in a narrow column on one screen and across
    the full width on another then responds to the room it actually has.
  </p>
  <p>
    The app shell is such a container. <code>.layout-app-shell</code> names itself
    <code>app-shell</code>, and below <code>48rem</code> of its own width the navigation leaves the side
    column and becomes a row under the header.
  </p>
  <DocsCode label="src/lib/ui/styles/utilities/layout.css, excerpt" code={SHELL} />
  <ShellWidthDemo />
</DocsSection>

<DocsSection title={UI_LIBRARY_SECTIONS.direction}>
  <p>
    The base library sits at the bottom of the UI code. A file in <code>src/lib/ui/</code> may
    import its siblings, <code>svelte</code>, <code>ts-pattern</code> and, in a spec,
    <code>vitest</code>, and nothing else in <code>src/</code>: no domain, no <code>shared/</code>,
    no container. Code above it composes it.
  </p>
  <Figure>
    <Diagram
      label="Routes import domain UI, domain UI imports shared, shared imports the base components; nothing imports upward"
      width={DIRECTION_DIAGRAM.width}
      height={DIRECTION_DIAGRAM.height}
      nodes={DIRECTION_DIAGRAM.nodes}
      edges={DIRECTION_DIAGRAM.edges}
    />
    {#snippet caption()}Imports run downward only. Each level may also import any level below it.{/snippet}
  </Figure>
  <p>
    The reason is reuse without surprises. Suppose a base <code>Card</code> imported something from
    the library domain to show a book count. Every screen that renders a card would now pull in the
    library domain, and the moment the library domain's own UI used <code>Card</code>, the two would
    import each other. So whatever a base component shows that belongs to the app arrives from its
    caller: a snippet, a prop or a callback. Even the words a reader sees are props with an English
    default, such as <code>closeLabel</code>.
  </p>
  <p>
    A dependency-cruiser rule enforces the boundary, and <code>deno task verify:static</code> fails on
    any import that crosses it.
  </p>
  <DocsCode label=".dependency-cruiser.cjs, the rule, without its comment" code={RULE} />
</DocsSection>

<DocsSection title={UI_LIBRARY_SECTIONS.playground}>
  <p>
    The playground at <a href="/playground">/playground</a> is the catalog: every base component and utility,
    in its variants, sizes and states, on one page. Each section heading lists the classes it shows, and
    the theme and scheme switcher at the top re-skins the whole page, which is the quickest way to check
    a change under all eight themes in both schemes. It is a development route: outside the dev server
    it responds with a 404. Every variant, utility or component added to the library must appear there.
  </p>
</DocsSection>

<DocsSection title={UI_LIBRARY_SECTIONS.rules}>
  <p>
    The rules above are checked by unit tests that read the stylesheets and the source as text, so a
    break fails <code>deno task test</code> rather than waiting for someone to notice a screen. The
    library's specs read only <code>src/lib/ui/</code>; the checks on Dokseo's own source and
    <code>app.html</code> live in <code>src/app-rules/</code>, under the same file names.
  </p>
  <ul>
    <li>
      <code>design-system.spec.ts</code>: the layer order in <code>app.html</code> and
      <code>index.css</code> is the same; no design-system file holds an <code>@layer</code> block;
      every file is imported once, into the layer its folder names;
      <code>{PRIMITIVE_NAMES.prefix}</code>
      names appear only in <code>base/</code> and <code>tokens/</code>; every theme assigns exactly
      the default theme's role primitives; every semantic token maps straight to a primitive; every
      custom property a component, utility or override reads resolves to a token; every runtime
      input is read with a fallback; every grid declares its columns; every media and container
      query switches at a width on the breakpoint scale.
    </li>
    <li>
      <code>source-styling.spec.ts</code>: no Svelte file has a <code>&lt;style&gt;</code> block,
      and every domain, shared and route stylesheet is one <code>@layer features</code> block
      holding one
      <code>@scope</code> block.
    </li>
    <li>
      <code>markup-classes.spec.ts</code>: every class the markup writes from a library family is
      defined in some stylesheet.
    </li>
    <li>
      <code>classes.spec.ts</code>: the class tables and the base components name only classes the
      stylesheets define.
    </li>
    <li>
      <code>theme-boot.spec.ts</code>: the first-paint script the library generates accepts exactly
      the themes the stylesheets define; <code>theme-before-first-paint.spec.ts</code>, in
      <code>src/app-rules/</code>: the script in <code>app.html</code> is that script, admitted by its
      hash.
    </li>
  </ul>
</DocsSection>
