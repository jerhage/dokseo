<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    UI_LIBRARY_PLAYGROUND_HREF,
    UI_LIBRARY_RULES_HREF,
    VENDORED_SECTIONS,
    vendoredHref,
  } from './vendored-sections';
</script>

<DocsSection title={VENDORED_SECTIONS.extracted}>
  <p>
    Kandan UI did not start in a repository of its own. I built it inside Dokseo, as
    <code>src/lib/components/</code> and <code>src/lib/styles/</code>, with the fonts in
    <code>static/fonts/</code>, and extracted it once I wanted it in other projects. The extraction
    is a lesson in turning one folder of an app into a library that the app then vendors like any
    other, and in what a single extra commit does to <code>git subtree split</code>. It went in four
    steps:
  </p>
  <StepList>
    <StepItem title="Prepare Dokseo">
      One folder for the library, fonts by relative URL, the theme code split between the library
      and the app, specs that test the library alone, and the playground and the README inside the
      folder.
    </StepItem>
    <StepItem title="Split">
      <code>git subtree split</code> built the library's history out of Dokseo's: ten commits, from
      the move into <code>src/lib/ui/</code> on.
    </StepItem>
    <StepItem title="Push">
      That history became the <code>main</code> of the new repository, kandan-ui-svelte.
    </StepItem>
    <StepItem title="Vendor it back">
      Dokseo removed its folder and added the library back with <code>git subtree add</code>, so it
      uses the library exactly as another app would.
    </StepItem>
  </StepList>
  <p>
    The last step left one commit in the wrong place, and every later split carried Dokseo's whole
    history because of it (<a href={vendoredHref('stray')}
      >The commit that pulled in all of Dokseo</a
    >).
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.folder}>
  <p>
    Every git subtree command works on one <code>--prefix</code>. Three folders would have been
    three subtrees, three squash commits per update, and three pushes for a fix that touches a
    component and its stylesheet. So the first step moved everything into one folder:
  </p>
  <ul class="col gap-2">
    <li><code>src/lib/ui/components/</code>, from <code>src/lib/components/</code>;</li>
    <li><code>src/lib/ui/styles/</code>, from <code>src/lib/styles/</code>;</li>
    <li><code>src/lib/ui/fonts/</code>, from <code>static/fonts/</code>, licenses included;</li>
    <li><code>src/lib/ui/appearance.ts</code>, from <code>src/lib/shared/</code>.</li>
  </ul>
  <p>
    One <code>git mv</code> moved the components, the styles and <code>appearance.ts</code>, and the
    same commit updated every import of them across Dokseo. The components and the styles kept their
    relative position, so a path such as the component spec's <code>../styles/</code> still
    resolved. The dependency rule that keeps the library free of app imports grew to cover the whole
    folder (<a href={vendoredHref('aliases')}>No app aliases</a>).
  </p>
  <p>
    The fonts moved in a commit of their own. My first <code>git mv</code> of them was refused by a
    permission rule on my machine, so I ran the move by hand in a terminal. Moving them out of
    <code>static/</code> changed how they are served: Vite now emits them with hashed names under
    <code>/_app/immutable/</code>, so the separate <code>/fonts/*</code> cache rule in
    <code>_headers</code> went, and a build plugin kept the licenses at their old URLs (<a
      href={vendoredHref('fonts')}>Fonts through relative URLs</a
    >).
  </p>
  <p>
    The move is also where the library's own history begins. <code>split</code> follows the prefix,
    so the commits from before the move stayed in Dokseo's history (<a href={vendoredHref('split')}
      >Extracting a library with split</a
    >). I accepted that: the older commits still exist, and <code>git log --follow</code> on a file finds
    them in Dokseo.
  </p>
  <p>
    The styles, the fonts and the appearance code moved once more later, into the framework-free
    core that Kandan UI vendors at <code>core/</code>, so in Dokseo they now sit under
    <code>src/lib/ui/core/</code> (<a href="/docs/kandan-core-plan"
      >A framework-free core: Kandan UI</a
    >).
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.outside}>
  <p>
    The theme code split in three. <code>appearance.ts</code> went into the library: it holds the
    theme names, the <code>data-theme</code> and <code>data-color-scheme</code> attributes, and
    <code>applyAppearance</code> and <code>readAppearance</code>, which every app using the
    stylesheets needs. While moving it, I derived the <code>Theme</code> union from an
    <code>as const</code> <code>THEMES</code> list, so the list and the type cannot disagree, and the
    first-paint script can be built from the list.
  </p>
  <p>
    <code>saved-appearance.ts</code> stayed in Dokseo. It stores the chosen appearance, and where to
    store it differs from app to app. It is about twenty lines of glue per app (<a
      href={vendoredHref('appearance')}>Saving the appearance</a
    >).
  </p>
  <p>
    The first-paint script stayed in <code>app.html</code>, because it has to be inline. What moved
    was its source: <code>themeBootScript</code> builds the script from <code>THEMES</code> and the
    storage keys, and Dokseo's <code>app.html</code> was regenerated from it, with a new content
    security policy hash and a drift test (<a href={vendoredHref('firstPaint')}
      >The script before the first paint</a
    >).
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
    I split each of them in two. The check about the app's use of the library became a Dokseo spec
    in <code>src/app-rules/</code>, and the half about the library stayed in the folder, reading
    only paths relative to itself (<a href={UI_LIBRARY_RULES_HREF}>Rules the tests enforce</a>). No
    check was lost: I planted an offender for each half and watched it fail (<a
      href={vendoredHref('specs')}>Specs in the library and in Dokseo</a
    >).
  </p>
  <p>
    The playground (<a href={UI_LIBRARY_PLAYGROUND_HREF}>The playground</a>) used to be a Dokseo
    route. Its sections moved into <code>src/lib/ui/playground/</code>, with
    <code>Playground.svelte</code> rendering them all, and moving them meant replacing every import from
    outside the library:
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
    <li><code>shared/PageTitle.svelte</code>: the route sets the title.</li>
    <li>
      <code>shared/text-search.ts</code>: <code>marked-segments.ts</code>, a case-insensitive match
      that is enough for the highlight demo.
    </li>
    <li><code>shared/composing-key.ts</code>: a copy in the playground, for the command demo.</li>
    <li>
      <code>$app/environment</code>: only the route's <code>+page.ts</code> used it, and it stayed in
      Dokseo with the 404 outside development.
    </li>
  </ul>
  <p>
    Last came <code>README.md</code>, the library's own guide to vendoring and integrating it, so
    the instructions travel with every copy.
  </p>
</DocsSection>
