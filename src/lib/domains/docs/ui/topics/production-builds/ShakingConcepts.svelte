<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import Figure from '$lib/components/Figure.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { TREE_SHAKING } from './build-diagrams';
  import {
    BUILD_SECTIONS,
    OFFLINE_SHELL_HREF,
    WORKERS_BUILD_HREF,
    buildHref,
  } from './build-sections';
  import BundleSampleDemo from './BundleSampleDemo.svelte';
  import LoadedResourcesDemo from './LoadedResourcesDemo.svelte';
  import { BUILD_WITH_PLUGIN } from './recorded-build';

  const SIDE_EFFECTS_FIELD = `{
  "name": "some-library",
  "sideEffects": false
}`;

  const SIDE_EFFECTS_LIST = `{
  "sideEffects": ["*.css", "./src/polyfills.js"]
}`;

  const PURE_ANNOTATION = `const table = /*#__PURE__*/ buildTable();`;

  const WORKER_START = `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });`;
</script>

<DocsSection title={BUILD_SECTIONS.shaking}>
  <p>
    Tree shaking is leaving out the exports nobody imports. A module often exports ten functions
    when a page calls one. The bundler starts from the entry points, marks every export that some
    module imports and every function those exports call, and leaves out the rest.
  </p>
  <p>
    This is possible because of how ES modules are written. An <code>import</code> or
    <code>export</code> declaration can only appear at the top level of a module, and it names a
    fixed string path and fixed names. So the bundler can read every import in the program without
    running any of it. CommonJS, with <code>require()</code> calls that can sit inside an
    <code>if</code> or take a computed path, does not give that guarantee, which is why tree shaking works
    best on ES modules.
  </p>
  <Figure>
    <Diagram {...TREE_SHAKING} />
    {#snippet caption()}
      The bundler keeps what the entry imports and what runs when the module loads, and drops the
      export nobody imports.
    {/snippet}
  </Figure>
  <p>
    The demo shows what a real bundler does with small samples. Pick a sample to see its source
    modules and the files Rolldown wrote for it.
  </p>
  <BundleSampleDemo />
</DocsSection>

<DocsSection title={BUILD_SECTIONS.effects}>
  <p>
    Dropping an unused export is safe. Dropping a whole module is not always safe, because loading a
    module runs its top-level code. A module that assigns to <code>window</code>, registers a custom
    element, patches a built-in prototype or imports a stylesheet changes the page just by being
    imported, even when nothing uses its exports. That is a side effect, and a bundler has to keep
    it unless it can prove the code has none. The barrel sample in the demo shows exactly this:
    nobody imports <code>register</code>, and the assignment to <code>window.registry</code> stays.
  </p>
  <p>
    A package can say up front that its modules have no side effects, with the
    <code>sideEffects</code> field in its <code>package.json</code>:
  </p>
  <DocsCode label="package.json" code={SIDE_EFFECTS_FIELD} />
  <p>
    With <code>false</code>, a bundler may drop any of the package's modules whose exports are
    unused, without looking inside it. A list of patterns instead names the files that do have side
    effects, so they are kept and the rest are not:
  </p>
  <DocsCode label="package.json" code={SIDE_EFFECTS_LIST} />
  <p>
    The field started in webpack and Rolldown reads it too: the documented order in which Rolldown
    settles whether a module has side effects ends with the <code>package.json</code> field and then
    a default of <code>true</code>. Of Dokseo's runtime dependencies, <code>ts-pattern</code> and
    <code>@tanstack/svelte-query</code> declare <code>"sideEffects": false</code>. The field is a
    claim by the package author; a package that sets it while one of its modules does have an effect
    loses that effect from the build.
  </p>
  <p>
    The same idea exists for a single call. A function call might do anything, so a bundler keeps
    <code>buildTable()</code> even when its result is unused. A
    <code>/*#__PURE__*/</code> comment in front of a call marks it as free of side effects, so the call
    can be dropped when its result is not used. Compilers emit these annotations in front of calls they
    create; the sample "A call marked pure" shows the difference.
  </p>
  <DocsCode label="An annotated call" code={PURE_ANNOTATION} />
</DocsSection>

<DocsSection title={BUILD_SECTIONS.barrels}>
  <p>
    A barrel file is an <code>index.ts</code> that re-exports the contents of a folder, so other
    code can write <code>import {'{'} add {'}'} from './tools'</code> instead of naming the file. It looks
    tidy, and it costs in both modes:
  </p>
  <ul>
    <li>
      In development, Vite fetches and transforms every module the barrel re-exports, because any of
      them might be the one that defines the name and any of them might have a side effect. The Vite
      performance guide recommends importing from the module itself for this reason.
    </li>
    <li>
      In a build, every module the barrel re-exports is part of the graph, and each one that may
      have a side effect stays in, even when only one export from one of them is used.
    </li>
  </ul>
  <p>
    A barrel is also where a module with top-level work turns into a cost for every importer. A
    module that builds a large table or registers itself at load can be harmless when only its own
    callers import it. Re-exported from a barrel that half the app imports, that work runs, and its
    code ships, everywhere the barrel is used.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.flags}>
  <p>
    Some facts are fixed when the code is built, while a running program would have to check them.
    Vite exposes some of them under
    <code>import.meta.env</code>: <code>DEV</code> and <code>PROD</code> are booleans, and Vite's
    guide says they are statically replaced at build time to make tree shaking effective. So in a
    production build, <code>import.meta.env.DEV</code> is the literal <code>false</code> in the source
    the bundler reads.
  </p>
  <p>
    That turns a runtime check into dead code. <code>if (!false) return;</code> always returns, so everything
    after it in the function cannot run, and the bundler removes it. Helpers that only the removed code
    called are then unused and go too. The sample "Code behind import.meta.env.DEV" in the demo above
    shows a whole tracing function disappear, call and all.
  </p>
  <p>
    SvelteKit's <code>dev</code> from <code>$app/environment</code> works the same way for code in a SvelteKit
    app. Both only remove code inside a branch the flag controls. A module imported at the top of a file
    is still imported, whatever the flag says.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.devOnly}>
  <p>
    Some code is only for the developer: a component playground, a debug panel, an explainer site
    like this one. Leaving it reachable but hidden in production costs bytes, and can cost more than
    bytes if it holds test data or internal notes. The ways to keep it out, from the lightest:
  </p>
  <ul>
    <li>
      <strong>A flag around the code.</strong> <code>if (import.meta.env.DEV)</code> removes what is inside
      the branch. It does not remove a route, a component file or anything imported at the top of a module.
    </li>
    <li>
      <strong>A guard that responds with 404.</strong> A route's load function can refuse to run outside
      development. The page cannot be opened, but its code is still built and still downloadable by its
      hashed URL.
    </li>
    <li>
      <strong>Keeping it out of the graph.</strong> If no entry point reaches the code, the bundler never
      reads it. That is the only option that leaves no trace in the output, and with a file-based router
      it means changing which files the router reads, or what they contain, at build time.
    </li>
  </ul>
  <p>
    The trade-off is how much the build setup has to depend on. A flag needs nothing; removing files
    from a router needs a build plugin that matches the router's file names. Dokseo uses a guard and
    a plugin together, described in <a href={buildHref('dokseoDevOnly')}
      >Leaving /docs out of the build</a
    >.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.assets}>
  <p>
    Not everything a page uses is JavaScript in a chunk. An image, a font or a WebAssembly file
    referenced with <code>new URL('./file.wasm', import.meta.url)</code> is copied into the output
    with a hashed name, and the expression becomes that URL. Vite inlines a file smaller than
    <code>build.assetsInlineLimit</code>, 4096 bytes by default, as a <code>data:</code> URL instead.
  </p>
  <p>A worker started the same way is a second program, so it gets an entry of its own:</p>
  <DocsCode label="Starting a module worker" code={WORKER_START} />
  <p>
    Vite bundles the worker file and everything it imports into separate output, with a hashed name.
    Code that only the worker imports never reaches the page's chunks. Vite's
    <code>worker.format</code> defaults to <code>'iife'</code>, a single file that cannot be split,
    so a dynamic import inside a worker is bundled into the worker's own file. Dokseo's workers are
    covered on the <a href={WORKERS_BUILD_HREF}>workers page</a>.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.precache}>
  <p>
    An offline app's service worker usually downloads a list of the build's files when it installs,
    so the app can start without a network (<a href={OFFLINE_SHELL_HREF}>Dokseo's service worker</a
    >). The list comes from the build, so it grows with every file the build writes, and the service
    worker downloads all of it, whether or not this device ever runs that code.
  </p>
  <p>
    That changes what code splitting buys. Splitting still keeps a large chunk out of the first page
    load. But a precached chunk is still downloaded once per release on every device, and dev-only
    files that the router never serves are downloaded too. Leaving code out of the build is the only
    way to keep it out of the precache.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.measuring}>
  <p>Bundle size goes wrong without an error, so it has to be measured:</p>
  <ul>
    <li>
      <strong>The build log.</strong> Vite prints each output file with its size and its gzip size,
      and warns about any chunk over <code>build.chunkSizeWarningLimit</code>, 500 kB by default.
    </li>
    <li>
      <strong>The manifest.</strong> With <code>build.manifest</code> on, Vite writes a JSON file
      that maps each source module to its output file and lists what each output imports and
      dynamically imports. SvelteKit turns it on and writes it to
      <code>.svelte-kit/output/client/.vite/manifest.json</code>. It shows which entry pulls in a
      given chunk.
    </li>
    <li>
      <strong>A treemap.</strong> A bundle visualizer draws every output file as a rectangle split into
      its source modules, sized by bytes, built from the bundle's module information or its source maps.
      It shows at a glance which dependency takes the space.
    </li>
    <li>
      <strong>The browser.</strong> The Network panel, or the Resource Timing API, lists what one page
      actually loaded.
    </li>
  </ul>
  <p>
    The demo reads this page's own entries from the Resource Timing API. This page only exists on
    the development server, so the numbers show the unbundled case: one request per module, each
    with its own headers. In Chromium I saw the count stop at 250, the size of its entry buffer,
    because this page alone requests more modules than that. The built app's first load is the
    {BUILD_WITH_PLUGIN.preloaded} files listed under
    <a href={buildHref('dokseoOutput')}>Dokseo's build output</a>.
  </p>
  <LoadedResourcesDemo />
</DocsSection>
