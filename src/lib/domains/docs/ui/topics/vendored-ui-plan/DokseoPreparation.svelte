<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { ABSOLUTE_FONT_URLS } from './library-reach';
  import LibraryReachDemo from './LibraryReachDemo.svelte';
  import { ADD_EXISTING, REVENDOR_HISTORY } from './subtree-runs';
  import {
    UI_LIBRARY_DIRECTION_HREF,
    UI_LIBRARY_PLAYGROUND_HREF,
    UI_LIBRARY_RULES_HREF,
    VENDORED_PLAN_SECTIONS,
    vendoredPlanHref,
  } from './vendored-sections';
  import { FONT_FACE, NO_APP_RULE, NO_APP_RULE_PATHS } from './vendored-snippets';
</script>

<DocsSection title={VENDORED_PLAN_SECTIONS.today}>
  <p>
    Today the library is spread over three folders of Dokseo, and a few pieces sit outside them:
  </p>
  <ul class="col gap-2">
    <li>
      <code>src/lib/components/</code>: the base components, their helpers and the icons, with their
      specs.
    </li>
    <li>
      <code>src/lib/styles/</code>: the layered stylesheets (reset, tokens, base, components,
      utilities, overrides) and their entry file <code>index.css</code>, with four specs.
    </li>
    <li><code>static/fonts/</code>: 28 font files and 18 license files.</li>
    <li>
      The theme pieces: the first-paint script and the layer order inline in <code
        >src/app.html</code
      >, and <code>appearance.ts</code> and <code>saved-appearance.ts</code> in
      <code>src/lib/shared/</code>.
    </li>
    <li>The playground route, <code>src/routes/playground/</code>.</li>
  </ul>
  <p>
    A folder can be vendored only if it builds without the app around it, so the first question is
    what each file imports:
  </p>
  <LibraryReachDemo />
  <p>
    The components import Svelte, <code>ts-pattern</code> and each other, and nothing else. The specs
    are different: two component specs and all four stylesheet specs reach above their folder, and the
    next sections deal with each kind.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.folder}>
  <p>
    Every git subtree command works on one <code>--prefix</code>. Three folders would be three
    subtrees, three squash commits per update, and three pushes for a fix that touches a component
    and its stylesheet. So the first step moves everything into one folder:
  </p>
  <ul class="col gap-2">
    <li><code>src/lib/ui/components/</code>, from <code>src/lib/components/</code>;</li>
    <li><code>src/lib/ui/styles/</code>, from <code>src/lib/styles/</code>;</li>
    <li><code>src/lib/ui/fonts/</code>, from <code>static/fonts/</code>, licenses included.</li>
  </ul>
  <p>
    The components and the styles keep their relative position, so a path such as the component
    spec's
    <code>../styles/</code> still resolves. The move is also where the library's own history begins:
    <code>split</code> follows the prefix, and the commits from before the move stay in Dokseo's
    history (<a href={vendoredPlanHref('split')}>Extracting a library with split</a>).
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.fonts}>
  <p>
    The fonts are served from <code>static/</code>, which SvelteKit copies to the root of the build
    unchanged, and the stylesheet names them by absolute URL. {ABSOLUTE_FONT_URLS} URLs in
    <code>fonts.css</code> look like this:
  </p>
  <DocsCode label={FONT_FACE.label} code={FONT_FACE.code} />
  <p>
    A vendored library cannot count on a file in the app's <code>static/</code> folder: a second app
    would have to copy 46 files there by hand and keep them in step. A relative URL, from the
    stylesheet to <code>src/lib/ui/fonts/</code>, makes the font part of the library. Vite resolves
    it at build time; its documentation says <code>url()</code> references in CSS are handled like
    imported assets, which "will get hashed file names". The fonts then land in
    <code>_app/immutable/</code>
    with the rest of the build, under the cache rule Dokseo's <code>_headers</code> already has for
    that folder, and the separate <code>/fonts/*</code> rule has nothing left to match.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.aliases}>
  <p>
    An app alias such as <code>$lib</code> means "this app's <code>src/lib</code>". Inside a
    vendored library it would point at whichever app the copy sits in, so the library has to reach
    its own files by relative path only. Dokseo holds the whole of <code>src/lib/ui/</code> to that,
    with a dependency rule (<a href={UI_LIBRARY_DIRECTION_HREF}>Dependency direction</a>):
  </p>
  <DocsCode label={NO_APP_RULE.label} code={NO_APP_RULE.code} />
  <DocsCode label={NO_APP_RULE_PATHS.label} code={NO_APP_RULE_PATHS.code} />
  <p>
    A file in the library may import its siblings, <code>svelte</code>, <code>ts-pattern</code>
    and, in a spec, <code>vitest</code>, and nothing else under <code>src/</code>. The demo above
    shows the result: no component imports an alias.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.outside}>
  <p>
    The theme code splits in three. <code>appearance.ts</code> goes into the library: it holds the
    theme names, the <code>data-theme</code> and <code>data-color-scheme</code> attributes, and
    <code>applyAppearance</code> and <code>readAppearance</code>, which every app using the
    stylesheets needs. On the way, the <code>Theme</code> union will be derived from an
    <code>as const</code>
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
    the default theme and then switch. The library will ship its reference source as a string built
    from
    <code>THEMES</code>, with the storage keys as parameters. Each app pastes the output for its
    keys, updates its content security policy hash, and keeps a drift test that its inline script
    equals the library's output. Dokseo's <code>theme-before-first-paint.spec.ts</code> becomes that test.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.tests}>
  <p>
    A vendored library has to test itself, or each app inherits code nothing checks. The specs that
    read only the library move with it. The demo shows which ones read more:
  </p>
  <ul class="col gap-2">
    <li>
      The icon spec reads the whole of <code>src/</code> to check that every icon is imported somewhere
      outside the playground.
    </li>
    <li>
      The stylesheet specs read <code>src/</code> to check how the app's markup and its domain
      stylesheets use the design system, and the first-paint spec reads <code>app.html</code>.
    </li>
  </ul>
  <p>
    Those are checks on an app's use of the library, so each splits: the half about the library
    moves into the vendored folder, and the half about Dokseo stays in Dokseo (<a
      href={UI_LIBRARY_RULES_HREF}>Rules the tests enforce</a
    >).
  </p>
  <p>
    The playground (<a href={UI_LIBRARY_PLAYGROUND_HREF}>The playground</a>) is the library's visual
    test: one page with every component. It is a SvelteKit route, and today it imports the
    components through <code>$lib</code>, reads <code>$app/environment</code>, shows the favicon
    from
    <code>src/lib/assets/</code>, and uses four modules from <code>src/lib/shared/</code>, among
    them the appearance switcher. It can move only once those imports are relative or part of the
    library.
  </p>
</DocsSection>

<DocsSection title={VENDORED_PLAN_SECTIONS.extract}>
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
