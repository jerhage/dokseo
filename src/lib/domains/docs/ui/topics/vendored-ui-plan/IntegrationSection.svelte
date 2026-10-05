<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    SECURITY_DIRECTIVES_HREF,
    UI_LIBRARY_LAYERS_HREF,
    UI_LIBRARY_SCHEMES_HREF,
    UI_LIBRARY_THEMES_HREF,
    VENDORED_PLAN_SECTIONS,
    vendoredPlanHref,
  } from './vendored-sections';
  import {
    APPEARANCE,
    APPLY_APPEARANCE,
    FIRST_PAINT_SCRIPT,
    LAYER_ORDER,
    SAVED_APPEARANCE,
    SCHEME_RULES,
    SCRIPT_HASH,
    STYLESHEET_IMPORT,
    THEME_FILE,
    THEME_IMPORTS,
  } from './vendored-snippets';

  const VENDOR_COMMANDS = `git subtree add --prefix=src/lib/ui <library repository> <tag> --squash
git subtree pull --prefix=src/lib/ui <library repository> <tag> --squash
git subtree push --prefix=src/lib/ui <library repository> <branch>`;
</script>

<DocsSection title={VENDORED_PLAN_SECTIONS.integrate}>
  <p>
    This is the guide a second app would follow, written against Dokseo's code as it is today. Once
    the library has its own repository, its README will carry the same guide, so an app's developer
    finds it in the vendored folder.
  </p>
  <StepList>
    <StepItem title="Vendor the library">
      Add a tagged version at one prefix, update with <code>pull</code>, and send fixes back with
      <code>push</code> (<a href={vendoredPlanHref('subtree')}>How git subtree works</a>).
    </StepItem>
    <StepItem title="Import the stylesheet once">
      The app's root layout imports the entry stylesheet, and <code>app.html</code> declares the layer
      order inline before any stylesheet loads.
    </StepItem>
    <StepItem title="Nothing to do for the fonts">
      The stylesheet loads them by relative URL, and the app's bundler emits them.
    </StepItem>
    <StepItem title="Save the appearance">
      The app's own version of <code>saved-appearance.ts</code>: store the theme and the scheme
      under its own keys, and call <code>applyAppearance</code>.
    </StepItem>
    <StepItem title="Apply it before the first paint">
      The inline script in <code>app.html</code>, its content security policy hash, and a drift
      test.
    </StepItem>
  </StepList>
  <DocsCode label="The three commands an app uses" code={VENDOR_COMMANDS} />

  <h3>The stylesheet and the layer order</h3>
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

  <h3>What the app writes</h3>
  <p>
    The library's part of the appearance is the vocabulary and the function that sets the
    attributes. Today, in <code>src/lib/ui/appearance.ts</code>:
  </p>
  <DocsCode label={APPEARANCE.label} code={APPEARANCE.code} />
  <DocsCode label={APPLY_APPEARANCE.label} code={APPLY_APPEARANCE.code} />
  <p>
    The app's part is where the choice is kept. Dokseo's version, which an app copies and adapts to
    its own keys and storage:
  </p>
  <DocsCode label={SAVED_APPEARANCE.label} code={SAVED_APPEARANCE.code} />
  <p>
    <code>rememberedString</code> is Dokseo's wrapper around <code>localStorage</code>, from its
    <code>platform/storage</code> module. The scheme key is removed, not set, when the scheme follows
    the system, which is the state the script below reads as "no pinned scheme".
  </p>

  <h3>The app.html script</h3>
  <p>
    The script runs while the browser parses <code>app.html</code>, before the first paint. It reads
    the two keys, accepts only known values, and sets the attributes on the <code>html</code> element.
    If reading storage throws, as it does when the browser blocks storage for the site, the defaults stay:
  </p>
  <DocsCode label={FIRST_PAINT_SCRIPT.label} code={FIRST_PAINT_SCRIPT.code} />
  <p>
    An app with a content security policy has to admit this inline script by its hash (<a
      href={SECURITY_DIRECTIVES_HREF}>Dokseo's policy, directive by directive</a
    >). Dokseo lists it in <code>script-src</code>, and a spec hashes every inline script in
    <code>app.html</code> and fails if the policy does not list the hash:
  </p>
  <DocsCode label={SCRIPT_HASH.label} code={SCRIPT_HASH.code} />
  <p>
    Today the theme list in the script is a second copy of <code>THEMES</code>, and
    <code>theme-before-first-paint.spec.ts</code> checks that it matches the themes the stylesheets define
    and that the script applies what is stored. With the library's reference source, the test becomes
    simpler: the app's inline script must equal the library's output for the app's keys.
  </p>

  <h3>The attribute contract</h3>
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

  <h3>Adding a theme</h3>
  <p>
    A theme is a stylesheet in <code>styles/base/themes/</code> whose rules start with its own
    selector, imported by <code>index.css</code> next to the others:
  </p>
  <DocsCode label={THEME_FILE.label} code={THEME_FILE.code} />
  <DocsCode label={THEME_IMPORTS.label} code={THEME_IMPORTS.code} />
  <p>
    Its name joins <code>THEMES</code> in the library. Each app then takes the update with a
    <code>pull</code>, pastes the new script output into <code>app.html</code> and updates the hash; until
    it does, its drift test fails and shows the difference.
  </p>
</DocsSection>
