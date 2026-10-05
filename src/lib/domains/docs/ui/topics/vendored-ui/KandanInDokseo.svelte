<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import LibraryReachDemo from './LibraryReachDemo.svelte';
  import {
    TESTING_PROJECTS_HREF,
    UI_LIBRARY_DIRECTION_HREF,
    VENDORED_SECTIONS,
    vendoredHref,
  } from './vendored-sections';
  import {
    DEPCRUISE_EXCLUDE,
    DOKSEO_CHECK,
    DOKSEO_UNIT_PROJECT,
    LIBRARY_DEPENDENCIES,
    LIBRARY_SCRIPTS,
    LIBRARY_VITEST,
    NESTED_CONFIG_OFF,
    NO_APP_RULE,
    NO_APP_RULE_PATHS,
  } from './vendored-snippets';
</script>

<DocsSection title={VENDORED_SECTIONS.today}>
  <p>
    Dokseo's UI library is Kandan UI. It has its own repository,
    <a href="https://github.com/jerhage/kandan-ui-svelte">kandan-ui-svelte</a>, and Dokseo vendors
    it at <code>src/lib/ui/</code> with <code>git subtree</code>, exactly as any other app would.
    The folder holds:
  </p>
  <ul class="col gap-2">
    <li>
      <code>components/</code>: the base components, their helpers and the icons, with their specs.
    </li>
    <li>
      <code>styles/</code>: the layered stylesheets (reset, tokens, base, components, utilities,
      overrides) and their entry file <code>index.css</code>, with their specs.
    </li>
    <li><code>fonts/</code>: 28 font files and 18 license files.</li>
    <li><code>appearance.ts</code>: the theme names and the attributes that apply them.</li>
    <li>
      <code>theme-boot.ts</code>: <code>themeBootScript</code>, the source of the first-paint
      script.
    </li>
    <li>
      <code>playground/</code>: every demo section and <code>Playground.svelte</code>, which renders
      them all.
    </li>
    <li><code>README.md</code>: the library's own guide, for any app that vendors it.</li>
    <li>
      <code>package.json</code>, <code>vitest.config.ts</code>, <code>tsconfig.json</code>,
      <code>.oxlintrc.json</code>, <code>.oxfmtrc.json</code> and <code>.gitignore</code>: the
      library's own tooling (<a href={vendoredHref('tooling')}>The library's own tooling</a>).
    </li>
  </ul>
  <p>Dokseo's side of the integration sits outside the folder:</p>
  <ul class="col gap-2">
    <li>
      The layer order and the first-paint script, inline in <code>src/app.html</code>, and
      <code>saved-appearance.ts</code> in <code>src/lib/shared/</code>.
    </li>
    <li>
      The plugin that publishes the font licenses, <code>fontLicensesPublished</code> in
      <code>vite.config.ts</code>.
    </li>
    <li>
      The playground route, <code>src/routes/playground/</code>, which mounts the library's
      playground.
    </li>
    <li>The specs about Dokseo's use of the library, in <code>src/app-rules/</code>.</li>
  </ul>
  <p>
    A folder can be vendored only if it builds without the app around it, so the first question is
    what each file imports:
  </p>
  <LibraryReachDemo />
  <p>
    The components import Svelte, <code>ts-pattern</code> and each other, and nothing else. A spec
    that reaches above its folder reaches only into the library: one component spec reads
    <code>../styles/</code>, the three stylesheet specs read <code>../</code>, and one of them also
    reads <code>../components/</code>. None reads the rest of Dokseo.
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.aliases}>
  <p>
    An app alias such as <code>$lib</code> means "this app's <code>src/lib</code>". Inside a
    vendored library it would point at whichever app the copy sits in, so the library reaches its
    own files by relative path only. Dokseo holds the whole of <code>src/lib/ui/</code> to that,
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

<DocsSection title={VENDORED_SECTIONS.tooling}>
  <p>
    Kandan UI is developed in its own repository too, and there it needs everything a project needs
    to check itself: dependencies to install, a test runner, a type check, a linter and a formatter.
    Those files live in the library's folder, so every <code>git subtree pull</code>
    brings them into each app along with the components. The <code>package.json</code> names the package
    and its scripts:
  </p>
  <DocsCode label={LIBRARY_SCRIPTS.label} code={LIBRARY_SCRIPTS.code} />
  <DocsCode label={LIBRARY_DEPENDENCIES.label} code={LIBRARY_DEPENDENCIES.code} />
  <p>
    The development dependencies are the tools behind those scripts, at the versions Dokseo's
    lockfile holds.
    <code>vitest.config.ts</code> compiles every <code>.svelte</code> file in runes mode and has one project,
    in Node, because the library has no browser specs:
  </p>
  <DocsCode label={LIBRARY_VITEST.label} code={LIBRARY_VITEST.code} />
  <p>
    <code>tsconfig.json</code> holds its own compiler options instead of extending SvelteKit's,
    because the library's repository has no SvelteKit. <code>.oxlintrc.json</code> and
    <code>.oxfmtrc.json</code> repeat Dokseo's rules that apply to library code: no
    <code>as</code> casts, type imports in their own statement, exports at the end, and the test
    name pattern. In the library's repository, <code>npm run verify</code> runs all four checks.
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.ignore}>
  <p>
    Inside Dokseo, those files must change nothing: Dokseo's own configuration decides how the
    library's files are checked, and the library's specs must run once, not twice. Each tool needs
    its own answer.
  </p>
  <p>
    oxlint and oxfmt look for configuration files in subfolders and apply a nested one to the files
    under it. Left alone, they would lint and format <code>src/lib/ui/</code> with the library's settings.
    Their help text describes the flag that turns that off: "Disable the automatic loading of nested configuration
    files" for oxlint, and "Do not search for configuration files in subdirectories" for oxfmt. Dokseo
    passes it on every run:
  </p>
  <DocsCode label={NESTED_CONFIG_OFF.label} code={NESTED_CONFIG_OFF.code} />
  <p>
    dependency-cruiser reads every file under <code>src/</code>, and the library's
    <code>vitest.config.ts</code> imports <code>@sveltejs/vite-plugin-svelte</code>, which the rule
    keeping the library to <code>svelte</code>, <code>ts-pattern</code> and <code>vitest</code>
    refuses (<a href={vendoredHref('aliases')}>No app aliases</a>). The file is tooling, not library
    code, so Dokseo excludes it:
  </p>
  <DocsCode label={DEPCRUISE_EXCLUDE.label} code={DEPCRUISE_EXCLUDE.code} />
  <p>
    Vitest reads Dokseo's <code>vite.config.ts</code>, which lists its two projects inline instead
    of naming config files to load, so the library's <code>vitest.config.ts</code> is never read (<a
      href={TESTING_PROJECTS_HREF}>Vitest's two projects</a
    >). The unit project's pattern already covers the library's specs, so they run once, with
    Dokseo's:
  </p>
  <DocsCode label={DOKSEO_UNIT_PROJECT.label} code={DOKSEO_UNIT_PROJECT.code} />
  <p>
    The type check names Dokseo's <code>tsconfig.json</code> on the command line, and checks the library's
    files with Dokseo's options:
  </p>
  <DocsCode label={DOKSEO_CHECK.label} code={DOKSEO_CHECK.code} />
  <p>
    The package manager needs nothing. A nested <code>package.json</code> joins an install only as a
    workspace member, and Dokseo declares no workspace: its <code>package.json</code> has no
    <code>workspaces</code> field, and it has no <code>deno.json</code>. Dokseo installs
    <code>svelte</code> and <code>ts-pattern</code> itself.
  </p>
  <p>
    What Dokseo does not run is the library's own type check, lint and format check with the
    library's settings. Those run in the library's repository, before a change reaches its
    <code>main</code>.
  </p>
</DocsSection>
