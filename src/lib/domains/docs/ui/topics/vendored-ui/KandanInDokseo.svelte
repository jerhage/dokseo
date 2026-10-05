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
    Kandan UI in turn vendors its framework-free core,
    <a href="https://github.com/jerhage/kandan-ui">kandan-ui</a>, at <code>core/</code>, so the core
    arrives inside it (<a href="/docs/kandan-core-plan">A framework-free core: Kandan UI</a>). The
    folder holds:
  </p>
  <ul class="col gap-2">
    <li>
      <code>core/</code>: the core, with the layered stylesheets in <code>styles/</code> (reset,
      tokens, base, components, utilities, overrides, and their entry file <code>index.css</code>),
      28 font files and 18 license files in <code>fonts/</code>, the icon sources in
      <code>icons/</code>, the theme names and the attributes that apply them in
      <code>appearance.js</code>, <code>themeBootScript</code> in <code>theme-boot.js</code>, the
      markup contract in <code>fixtures/</code>, <code>rules/</code> and <code>contract/</code>, and
      its own specs, guide and tooling.
    </li>
    <li>
      <code>components/</code>: the base components, their helpers and the icons generated from the
      core's, with their specs.
    </li>
    <li>
      <code>contract/</code>: the cases and specs that hold the components to the core's fixtures
      and behavior rules.
    </li>
    <li>
      <code>playground/</code>: every demo section and <code>Playground.svelte</code>, which renders
      them all.
    </li>
    <li><code>scripts/</code>: the script that writes the icon components.</li>
    <li><code>README.md</code>: the origin of the library and the subtree commands.</li>
    <li><code>GUIDE.md</code>: the library's own guide, for any app that vendors it.</li>
    <li>
      <code>package.json</code>, <code>vitest.config.ts</code>,
      <code>vitest.browser.config.ts</code>,
      <code>tsconfig.json</code>, <code>.oxlintrc.json</code>, <code>.oxfmtrc.json</code>,
      <code>.gitignore</code>, <code>.github/</code> and <code>LICENSE</code>: the library's own
      tooling and license (<a href={vendoredHref('tooling')}>The library's own tooling</a>).
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
    The components import Svelte, <code>ts-pattern</code> and each other, and four of them import
    the tag color type from the core's <code>tag-colours.js</code>. A spec that reaches above its
    folder reaches only into the library: <code>classes.spec.ts</code> reads the core's
    <code>tag-colours.js</code> and stylesheets, the icon spec reads the core's SVG files and the
    generator in <code>scripts/</code>, and the core's two stylesheet specs read the core's own
    folder. None reads the rest of Dokseo.
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
    <code>vitest.config.ts</code> compiles every <code>.svelte</code> file in runes mode and has one
    project, in Node, which leaves out the core's specs. The browser specs have a config of their
    own,
    <code>vitest.browser.config.ts</code>, which only <code>npm run test:browser</code> reads, so
    neither <code>test</code> nor <code>verify</code> starts a browser:
  </p>
  <DocsCode label={LIBRARY_VITEST.label} code={LIBRARY_VITEST.code} />
  <p>
    <code>tsconfig.json</code> holds its own compiler options instead of extending SvelteKit's,
    because the library's repository has no SvelteKit. <code>.oxlintrc.json</code> and
    <code>.oxfmtrc.json</code> repeat Dokseo's rules that apply to library code: no
    <code>as</code> casts, type imports in their own statement, exports at the end, and the test
    name pattern. In the library's repository, <code>npm run verify</code> runs the type check, the
    lint, the format check, the unit specs and the core's specs, which <code>test:core</code>
    runs with Node's own test runner.
  </p>
</DocsSection>

<DocsSection title={VENDORED_SECTIONS.ignore}>
  <p>
    Inside Dokseo, those files must change nothing: Dokseo's own configuration sets how the
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
    refuses (<a href={vendoredHref('aliases')}>No app aliases</a>), as it refuses
    <code>vitest.browser.config.ts</code>'s import of <code>@vitest/browser-playwright</code>. Both
    files are tooling, not library code, and so are the icon generator in <code>scripts/</code> and
    the core's <code>node --test</code> specs, so Dokseo excludes them:
  </p>
  <DocsCode label={DEPCRUISE_EXCLUDE.label} code={DEPCRUISE_EXCLUDE.code} />
  <p>
    Vitest reads Dokseo's <code>vite.config.ts</code>, which lists its two projects inline instead
    of naming config files to load, so the library's <code>vitest.config.ts</code> is never read (<a
      href={TESTING_PROJECTS_HREF}>Vitest's two projects</a
    >). The unit project's pattern covers the library's specs, the contract specs among them, so
    they run once, with Dokseo's. It leaves out <code>src/lib/ui/core/</code>: the core's specs are
    written for Node's own test runner, not for Vitest. The browser project leaves out the whole of
    <code>src/lib/ui/</code>, because the library's browser spec, which runs the core's behavior
    rules against the components, belongs to the library's own browser run:
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
