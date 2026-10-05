<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { RELATIVE_FONT_URLS } from './library-reach';
  import {
    SECURITY_DIRECTIVES_HREF,
    TESTING_DRIFT_HREF,
    UI_LIBRARY_LAYERS_HREF,
    UI_LIBRARY_PLAYGROUND_HREF,
    UI_LIBRARY_RULES_HREF,
    UI_LIBRARY_SCHEMES_HREF,
    UI_LIBRARY_THEMES_HREF,
    VENDORED_SECTIONS,
    vendoredHref,
  } from './vendored-sections';
  import {
    APPEARANCE,
    APPLY_APPEARANCE,
    DRIFT_KEYS,
    DRIFT_TESTS,
    FIRST_PAINT_SCRIPT,
    FONT_FACE,
    FONT_LICENSES,
    LAYER_ORDER,
    PLAYGROUND_GUARD,
    PLAYGROUND_ROUTE,
    SAVED_APPEARANCE,
    SCHEME_RULES,
    SCRIPT_HASH,
    STYLESHEET_IMPORT,
    THEME_FILE,
    THEME_IMPORTS,
  } from './vendored-snippets';
</script>

<DocsSection title={VENDORED_SECTIONS.integrate}>
  <p>
    The library ships its integration guide in its own folder, <code>src/lib/ui/README.md</code>, so
    a developer finds it in the vendored copy. Dokseo follows it like any app:
  </p>
  <StepList>
    <StepItem title="Vendor the library">
      Add a version at one prefix, update with <code>pull</code>, and send fixes back with
      <code>push</code> (<a href={vendoredHref('update')}>Taking a library update</a>).
    </StepItem>
    <StepItem title="Import the stylesheet once">
      The root layout imports the entry stylesheet, and <code>app.html</code> declares the layer order
      inline before any stylesheet loads.
    </StepItem>
    <StepItem title="Let the bundler emit the fonts">
      The stylesheet loads them by relative URL. Publishing their licenses is the app's choice (<a
        href={vendoredHref('fonts')}>Fonts through relative URLs</a
      >).
    </StepItem>
    <StepItem title="Save the appearance">
      The app's own <code>saved-appearance.ts</code>: store the theme and the scheme under its own
      keys, and call <code>applyAppearance</code>.
    </StepItem>
    <StepItem title="Apply it before the first paint">
      The inline script in <code>app.html</code>, its content security policy hash, and a drift
      test.
    </StepItem>
    <StepItem title="Mount the playground">
      A development route that renders <code>Playground</code>.
    </StepItem>
  </StepList>
  <p>Dokseo imports the entry file once, in its root layout:</p>
  <DocsCode label={STYLESHEET_IMPORT.label} code={STYLESHEET_IMPORT.code} />
  <p>
    The layer order comes first in <code>app.html</code>, inside an inline <code>style</code>
    element, because the order of cascade layers is fixed by the first place a browser meets each name,
    and a component's own stylesheet can load before <code>index.css</code> does (<a
      href={UI_LIBRARY_LAYERS_HREF}>Layers in Dokseo</a
    >):
  </p>
  <DocsCode label={LAYER_ORDER.label} code={LAYER_ORDER.code} />
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.fonts}>
  <p>
    A vendored library cannot count on files in the app's <code>static/</code> folder: every app
    would have to copy 46 font and license files there by hand and keep them in step. So the fonts
    sit in
    <code>src/lib/ui/fonts/</code>, and the {RELATIVE_FONT_URLS} URLs in <code>fonts.css</code> are relative
    to the stylesheet:
  </p>
  <DocsCode label={FONT_FACE.label} code={FONT_FACE.code} />
  <p>
    Vite resolves them at build time; its documentation says <code>url()</code> references in CSS
    are handled like imported assets, which "will get hashed file names". Each font lands in
    <code>_app/immutable/assets/</code> with the rest of the build, as
    <code>bricolage-grotesque.DLoelf7F.woff2</code> for the one above, under the cache rule Dokseo's
    <code>_headers</code> already has for that folder. A changed font gets a new name, so a year of caching
    never serves an old one, and the service worker precaches the fonts as build files.
  </p>
  <p>
    The license files sit next to their fonts. Nothing imports them, so Vite would not copy them.
    Dokseo keeps their URLs, <code>/fonts/&lt;name&gt;.OFL.txt</code>, with a small plugin,
    <code>fontLicensesPublished</code>, that writes each one into the client build:
  </p>
  <DocsCode label={FONT_LICENSES.label} code={FONT_LICENSES.code} />
  <p>
    They are not build files in SvelteKit's sense, so the service worker leaves them out of the
    precache, and they exist only in a build: under <code>vite dev</code> they answer 404. The plugin
    is Dokseo's; whether and where another app publishes the licenses is up to that app's author.
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.appearance}>
  <p>
    The library's part of the appearance is the vocabulary and the function that sets the
    attributes, in <code>src/lib/ui/appearance.ts</code>. The <code>Theme</code> union is derived
    from an <code>as const</code> <code>THEMES</code> list, so the list and the type cannot disagree:
  </p>
  <DocsCode label={APPEARANCE.label} code={APPEARANCE.code} />
  <DocsCode label={APPLY_APPEARANCE.label} code={APPLY_APPEARANCE.code} />
  <p>
    Where the choice is kept is each app's part. Dokseo writes two <code>localStorage</code> keys
    through its own <code>platform/storage</code> module, which the library may not import:
  </p>
  <DocsCode label={SAVED_APPEARANCE.label} code={SAVED_APPEARANCE.code} />
  <p>
    <code>rememberedString</code> is Dokseo's wrapper around <code>localStorage</code>. The scheme
    key is removed, not set, when the scheme follows the system, which is the state the first-paint
    script reads as "no pinned scheme". Another app stores the choice its own way, under its own
    keys.
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.firstPaint}>
  <p>
    The saved appearance has to be on the <code>html</code> element before the first paint, or the
    page paints in the default theme and then switches. A module loads too late for that, so the
    script is inline in <code>app.html</code> and runs while the browser parses it. It reads the two keys,
    accepts only known values, and sets the attributes. If reading storage throws, as it does when the
    browser blocks storage for the site, the defaults stay:
  </p>
  <DocsCode label={FIRST_PAINT_SCRIPT.label} code={FIRST_PAINT_SCRIPT.code} />
  <p>
    The script is not written by hand. <code>themeBootScript</code> in the library builds it from
    <code>THEMES</code> and an app's two keys, and the library's own spec runs the result against stored,
    missing, unknown and unreadable values. Dokseo pasted the output for its keys:
  </p>
  <DocsCode label={DRIFT_KEYS.label} code={DRIFT_KEYS.code} />
  <p>
    Dokseo's content security policy admits the inline script by its hash (<a
      href={SECURITY_DIRECTIVES_HREF}>Dokseo's policy, directive by directive</a
    >):
  </p>
  <DocsCode label={SCRIPT_HASH.label} code={SCRIPT_HASH.code} />
  <p>
    A drift test in <code>src/app-rules/</code> keeps the pasted copy and the hash honest (<a
      href={TESTING_DRIFT_HREF}>Drift tests</a
    >). The formatter re-indents the script inside <code>app.html</code>, so the first check
    compares line by line with indentation set aside. The hash covers the text exactly as written,
    so the second check hashes it as it stands:
  </p>
  <DocsCode label={DRIFT_TESTS.label} code={DRIFT_TESTS.code} />
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.contract}>
  <p>
    The stylesheets read two attributes on the <code>html</code> element, and nothing else about the appearance:
  </p>
  <ul class="col gap-2">
    <li>
      <code>data-theme</code> names one of <code>THEMES</code>. The script and
      <code>readAppearance</code> fall back to <code>base</code> (<a href={UI_LIBRARY_THEMES_HREF}
        >Themes</a
      >).
    </li>
    <li>
      <code>data-color-scheme</code> is <code>light</code> or <code>dark</code> to pin a scheme, and
      absent to follow the system (<a href={UI_LIBRARY_SCHEMES_HREF}>Color schemes</a>).
    </li>
  </ul>
  <DocsCode label={SCHEME_RULES.label} code={SCHEME_RULES.code} />
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.addTheme}>
  <p>
    A theme is a stylesheet in <code>styles/base/themes/</code> whose rules start with its own
    selector, imported by <code>index.css</code> next to the others:
  </p>
  <DocsCode label={THEME_FILE.label} code={THEME_FILE.code} />
  <DocsCode label={THEME_IMPORTS.label} code={THEME_IMPORTS.code} />
  <p>
    Its name joins <code>THEMES</code> in the library. Each app then takes the update with a
    <code>pull</code>, pastes the new script output into <code>app.html</code> and updates the hash. Until
    it does, its drift test fails and shows the difference.
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.playground}>
  <p>
    The playground (<a href={UI_LIBRARY_PLAYGROUND_HREF}>The playground</a>) is the library's visual
    test: one page with every component and utility in its variants, sizes and states. It ships
    inside the library as <code>playground/Playground.svelte</code>, which takes two optional
    snippets: <code>appearanceControl</code> for the app's own theme and scheme switcher in the
    header, and <code>demos</code> for the app's own extra sections. Dokseo's route passes its switcher
    and sets the title:
  </p>
  <DocsCode label={PLAYGROUND_ROUTE.label} code={PLAYGROUND_ROUTE.code} />
  <p>
    Keeping the page out of production is Dokseo's business, not the library's. The route's
    <code>+page.ts</code> answers 404 outside development, and the build plugin
    <code>devOnlyRoutesLeftOut</code> empties the route's component in a production build:
  </p>
  <DocsCode label={PLAYGROUND_GUARD.label} code={PLAYGROUND_GUARD.code} />
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.specs}>
  <p>
    The library tests itself, and each app checks its own use of it. The library's specs read only
    paths relative to themselves, so they pass at any prefix (<a href={UI_LIBRARY_RULES_HREF}
      >Rules the tests enforce</a
    >). The checks on how Dokseo uses the library live in <code>src/app-rules/</code>, under the
    same file names as the library halves they complement:
  </p>
  <ul class="col gap-2">
    <li>
      <code>design-system.spec.ts</code>: the library half checks the layer order in
      <code>index.css</code>, the <code>--ds-</code> names and the query widths of the library's
      stylesheets; Dokseo's half checks the layer order in <code>app.html</code>, and the same names
      and widths in Dokseo's own files.
    </li>
    <li>
      <code>source-styling.spec.ts</code> and <code>markup-classes.spec.ts</code>: each half applies
      the same rules to its own files.
    </li>
    <li>
      <code>icons.spec.ts</code>: rendering and naming are the library's; the check that a
      component, a domain or a screen of Dokseo imports every icon the library ships is Dokseo's.
    </li>
    <li>
      <code>theme-before-first-paint.spec.ts</code>: Dokseo's drift test for <code>app.html</code>
      (<a href={vendoredHref('firstPaint')}>The script before the first paint</a>), against the
      library's <code>theme-boot.spec.ts</code>.
    </li>
  </ul>
</DocsSection>
