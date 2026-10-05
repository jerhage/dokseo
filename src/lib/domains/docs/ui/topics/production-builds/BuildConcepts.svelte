<script lang="ts">
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { MODULES_TO_CHUNKS } from './build-diagrams';
  import { BUILD_SECTIONS, OFFLINE_CACHES_HREF, buildHref } from './build-sections';
  import { bundleSample } from './bundle-samples';

  const split = bundleSample('split');
  const minified = bundleSample('minified');
</script>

<DocsSection title={BUILD_SECTIONS.job}>
  <p>
    A web app is written as many small modules: one file per component, per helper, per screen.
    During development that is fine. By default Vite's dev server does not bundle at all: the
    browser requests each module when it reaches an <code>import</code>, and the server transforms
    that one file (compiles a <code>.svelte</code> file, strips the types from a <code>.ts</code> file)
    and sends it back. A page that uses three hundred modules makes three hundred requests, which is quick
    over a local connection and slow over a phone's.
  </p>
  <p>
    <code>vite build</code> does the opposite. It reads the whole program ahead of time and writes a folder
    of files meant to be served as they are, to strangers, for months. The steps, roughly in the order
    they happen:
  </p>
  <StepList>
    <StepItem title="Find the entry points">
      An entry point is a module the page loads first. For a SvelteKit app those are the client
      start script and one node per route: the route's <code>+page.svelte</code>, its layouts and
      its
      <code>+page.ts</code>.
    </StepItem>
    <StepItem title="Follow every import">
      From each entry, the bundler reads every static <code>import</code> and builds the module graph:
      which module needs which.
    </StepItem>
    <StepItem title="Group modules into chunks">
      Modules are concatenated into a smaller number of output files, chunks. A dynamic
      <code>import()</code> starts a chunk of its own.
    </StepItem>
    <StepItem title="Drop what nothing uses">
      Exports that no module imports, and code that can never run, are left out. This is tree
      shaking and dead-code elimination.
    </StepItem>
    <StepItem title="Minify">
      Whitespace and comments go, local names get shorter, and constant expressions are folded.
    </StepItem>
    <StepItem title="Extract the CSS">
      Styles imported from JavaScript become separate <code>.css</code> files instead of code that
      injects a <code>&lt;style&gt;</code> tag.
    </StepItem>
    <StepItem title="Name each file by its content">
      Every output file gets a short hash of its bytes in its name, so a changed file has a new
      name.
    </StepItem>
  </StepList>
  <p>
    The tools that do this vary by version. Dokseo is built with Vite 8.3.0, which bundles with
    Rolldown (1.2.9 is installed), a bundler written in Rust with Rollup's plugin interface. Its
    defaults, read from the installed Vite source, minify JavaScript with Oxc and CSS with Lightning
    CSS. Earlier Vite versions used Rollup for builds and esbuild for minifying; the ideas below are
    the same for all of them.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.chunks}>
  <p>
    A chunk is one output JavaScript file. The bundler gives each entry point a chunk and puts each
    module into the chunk of the entries that use it. A module used by one entry goes into that
    entry's chunk. A module used by several entries is not copied into each of them: it goes into a
    shared chunk that each of those entries imports, so a browser that visits both pages downloads
    it once.
  </p>
  <Figure>
    <Diagram {...MODULES_TO_CHUNKS} />
    {#snippet caption()}
      An example: two route entries, a component both use, a component only one uses, and an adapter
      reached only through <code>import()</code>.
    {/snippet}
  </Figure>
  <p>
    The grouping follows the set of entries that reach each module. Modules reached by exactly the
    same entries end up together; a new entry that uses some of them in a different combination can
    split one shared chunk into several smaller ones. So the number of chunks says little on its
    own. What matters is which of them a page has to load before it can show anything.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.split}>
  <p>
    A static <code>import</code> at the top of a module states that the imported code is needed
    before the module runs, so the bundler puts it in the same load. A dynamic
    <code>import('./heavy.js')</code> is an expression that returns a promise, evaluated only when that
    line runs. The bundler treats it as a split point: the imported module and everything only it needs
    go into a separate chunk, which the browser fetches the first time the expression runs.
  </p>
  {#each split.files.slice(0, 1) as file (file.name)}
    <DocsCode label={file.name} code={file.code.trimEnd()} />
  {/each}
  <p>
    Built, that sample produces {split.chunks.length} files: the entry, and a separate
    <code>{split.chunks[1]?.fileName ?? ''}</code> holding <code>run</code>. The demo under
    <a href={buildHref('shaking')}>Tree shaking</a> shows both outputs.
  </p>
  <p>
    The split only holds while every import of that module is dynamic. One static import of
    <code>heavy.js</code> anywhere in the first load puts it back into that load, and nothing fails: the
    app works, it is just bigger. Only the build output shows the difference.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.minify}>
  <p>
    Minification rewrites code to be smaller without changing what it does. It removes whitespace
    and comments, renames local variables and functions to one or two letters, and folds expressions
    whose value is known while building. Exported names and property names are kept, because other
    code refers to them by name. The first sample from the demo below, with Vite's default minifier
    on:
  </p>
  {#each minified.chunks as chunk (chunk.fileName)}
    <DocsCode label={chunk.fileName} code={chunk.code} />
  {/each}
  <p>
    A server usually compresses the files again with gzip or Brotli on the way out, which is why
    Vite's build log prints a gzip size next to each file. Minifying and compressing do different
    work: compression finds repeated bytes, minification removes bytes that are not needed at all.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.hashing}>
  <p>
    A browser keeps a downloaded file in its HTTP cache for as long as the response's
    <code>Cache-Control</code> header allows (<a href={OFFLINE_CACHES_HREF}
      >The Cache API and the HTTP cache</a
    >). A long lifetime saves requests, but a file cached for a year under a fixed name like
    <code>app.js</code> cannot be updated: the browser keeps the old copy.
  </p>
  <p>
    A content hash solves both. The build names each file after a hash of its bytes, such as
    <code>entry-W-lnETS_.js</code>. A file that did not change keeps its name and stays cached; a
    file that changed gets a new name, so the browser has never seen it and fetches it. Two
    different builds that produce the same bytes produce the same name. Only the HTML document,
    which names the hashed files, keeps a fixed name and has to be revalidated on each visit.
  </p>
  <p>
    Those files can then be served with <code
      >Cache-Control: public, max-age=31536000, immutable</code
    >: keep it for a year, and, in browsers that honor <code>immutable</code>, do not revalidate it
    even on a reload, because a file at this URL never changes.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.css}>
  <p>
    In development, a CSS file imported from JavaScript is served as a small module that inserts a
    <code>&lt;style&gt;</code> element, so an edit can replace it without reloading. A production
    build extracts that CSS into real <code>.css</code> files, minified, and links them from the
    page, so the styles load in parallel with the scripts and can be cached on their own. With
    Vite's default <code>build.cssCodeSplit</code>, CSS imported by a lazily loaded chunk gets its
    own file, fetched together with that chunk, instead of joining the first load.
  </p>
</DocsSection>
