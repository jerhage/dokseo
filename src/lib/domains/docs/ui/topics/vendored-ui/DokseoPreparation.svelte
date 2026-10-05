<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { ADD_EXISTING, REVENDOR_HISTORY } from './subtree-runs';
  import {
    UI_LIBRARY_PLAYGROUND_HREF,
    UI_LIBRARY_RULES_HREF,
    VENDORED_SECTIONS,
    vendoredHref,
  } from './vendored-sections';
</script>

<DocsSection title={VENDORED_SECTIONS.folder}>
  <p>
    Every git subtree command works on one <code>--prefix</code>. Three folders would be three
    subtrees, three squash commits per update, and three pushes for a fix that touches a component
    and its stylesheet. So the first step moved everything into one folder:
  </p>
  <ul class="col gap-2">
    <li><code>src/lib/ui/components/</code>, from <code>src/lib/components/</code>;</li>
    <li><code>src/lib/ui/styles/</code>, from <code>src/lib/styles/</code>;</li>
    <li><code>src/lib/ui/fonts/</code>, from <code>static/fonts/</code>, licenses included;</li>
    <li><code>src/lib/ui/appearance.ts</code>, from <code>src/lib/shared/</code>.</li>
  </ul>
  <p>
    The components and the styles keep their relative position, so a path such as the component
    spec's
    <code>../styles/</code> still resolves. The move is also where the library's own history begins:
    <code>split</code> follows the prefix, and the commits from before the move stay in Dokseo's
    history (<a href={vendoredHref('split')}>Extracting a library with split</a>).
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.outside}>
  <p>
    The theme code splits in three. <code>appearance.ts</code> is in the library: it holds the theme
    names, the <code>data-theme</code> and <code>data-color-scheme</code> attributes, and
    <code>applyAppearance</code> and <code>readAppearance</code>, which every app using the
    stylesheets needs. The <code>Theme</code> union is derived from an <code>as const</code>
    <code>THEMES</code> list, so the list and the type cannot disagree.
  </p>
  <p>
    <code>saved-appearance.ts</code> stays in each app. It decides where the choice is stored:
    Dokseo writes two <code>localStorage</code> keys through its own <code>platform/storage</code> module,
    which the library may not import. Another app may store the choice elsewhere, under its own keys.
    It is about twenty lines of glue per app.
  </p>
  <p>
    The first-paint script stays in each app's <code>app.html</code>. It has to be inline: it sets
    the attributes before the first paint, before any module has loaded, or the page would paint in
    the default theme and then switch. The library ships its source:
    <code>themeBootScript</code> in <code>theme-boot.ts</code> builds it from <code>THEMES</code>,
    with the storage keys as parameters. Each app pastes the output for its keys, updates its
    content security policy hash, and keeps a drift test that its inline script equals the library's
    output. Dokseo's is <code>src/app-rules/theme-before-first-paint.spec.ts</code>
    (<a href={vendoredHref('integrate')}>Integrating the library into an app</a>).
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.tests}>
  <p>
    A vendored library has to test itself, or each app inherits code nothing checks. Five specs used
    to read more than the library: the icon spec read the whole of <code>src/</code> to check that
    every icon is imported somewhere outside the playground, three stylesheet specs read
    <code>src/</code> to check how the app's markup and its own stylesheets use the design system,
    and the first-paint spec read <code>app.html</code>.
  </p>
  <p>
    Each check about an app's use of the library split off into a Dokseo spec, in
    <code>src/app-rules/</code>, and the half about the library stayed in the vendored folder,
    reading only paths relative to itself (<a href={UI_LIBRARY_RULES_HREF}
      >Rules the tests enforce</a
    >):
  </p>
  <ul class="col gap-2">
    <li>
      <code>design-system.spec.ts</code>: the library half checks the layer order in
      <code>index.css</code>, the <code>--ds-</code> names and the query widths of the library's
      stylesheets; the Dokseo half checks the layer order in <code>app.html</code>, and the same
      names and widths in Dokseo's own files.
    </li>
    <li>
      <code>source-styling.spec.ts</code> and <code>markup-classes.spec.ts</code>: each half applies
      the same rules to its own files, and the playground's stylesheets follow the feature-layer
      rule inside the library.
    </li>
    <li>
      <code>icons.spec.ts</code>: rendering and naming stay in the library; the check that every
      icon is imported by Dokseo outside the playground is Dokseo's.
    </li>
    <li>
      <code>theme-before-first-paint.spec.ts</code>: the library's
      <code>theme-boot.spec.ts</code> runs the generated script against stored, missing, unknown and
      unreadable values; Dokseo's checks that <code>app.html</code> holds that script and that the policy
      admits its hash.
    </li>
  </ul>
  <p>
    The playground (<a href={UI_LIBRARY_PLAYGROUND_HREF}>The playground</a>) is the library's visual
    test: one page with every component. Its sections now live in
    <code>src/lib/ui/playground/</code>, with <code>Playground.svelte</code> rendering them all and two
    optional snippets: the app's appearance switcher for the header, and the app's own extra demos. Moving
    it meant replacing every import from outside the library:
  </p>
  <ul class="col gap-2">
    <li><code>$lib/ui/…</code>: relative paths, including the icon glob.</li>
    <li>
      The favicon from <code>src/lib/assets/</code>: a sample image of the library's own,
      <code>sample-avatar.svg</code>.
    </li>
    <li>
      <code>shared/AppearanceSwitcher.svelte</code>: the <code>appearanceControl</code> snippet, which
      Dokseo's route fills with its switcher.
    </li>
    <li>
      <code>shared/PageTitle.svelte</code>: the route sets the title.
    </li>
    <li>
      <code>shared/text-search.ts</code>: <code>marked-segments.ts</code>, a case-insensitive match
      that is enough for the highlight demo.
    </li>
    <li>
      <code>shared/composing-key.ts</code>: a copy in the playground, for the command demo.
    </li>
    <li>
      <code>$app/environment</code>: only the route's <code>+page.ts</code> used it, and it stays in Dokseo
      with the 404 outside development.
    </li>
  </ul>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.extract}>
  <p>
    Once <code>src/lib/ui/</code> stands on its own,
    <code>git subtree split --prefix=src/lib/ui</code>
    produces the library's history, which becomes the <code>main</code> of a new library repository.
    Dokseo then vendors that repository the way any app will, so its copy is updated and sent back
    with the same commands. <code>add</code> refuses a prefix that exists:
  </p>
  <DocsCode label={ADD_EXISTING.label} code={ADD_EXISTING.code} />
  <p>
    So the folder is removed in one commit and added back from the new repository in the next. In
    the scratch run, the app's files after the add were identical to those before the removal (<code
      >git diff</code
    > between the two commits printed nothing), and the history reads:
  </p>
  <DocsCode label={REVENDOR_HISTORY.label} code={REVENDOR_HISTORY.code} />
</DocsSection>
