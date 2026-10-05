<script lang="ts">
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { byteFigure, exactBytes } from '../../../domain/production-builds';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    ARCHITECTURE_BARRELS_HREF,
    ARCHITECTURE_LANGUAGES_HREF,
    BUILD_SECTIONS,
    OCR_CACHE_HREF,
    OCR_RUNTIME_HREF,
    RENDERING_PDF_LOADING_HREF,
    buildHref,
  } from './build-sections';
  import {
    DEV_ONLY_PLUGIN,
    DOCS_GUARD,
    HEADERS,
    OCR_WORKER_START,
    PDF_BUILD_FILES,
    PDF_RULE,
    PLUGIN_ORDER,
    PRECACHE,
    RECOGNIZER_IMPORTS,
    RUNTIME_FROM_CDN,
    SHELL_ASSET_LIST,
    SHELL_ASSETS,
    STORED_PAGE_SOURCE,
    TRACE_GUARD,
    WASM_PATHS,
  } from './build-snippets';
  import {
    BUILD_MILESTONES,
    BUILD_WITH_PLUGIN,
    BUILD_WITHOUT_PLUGIN,
    BUILT_GUARD_NODE,
    BUILT_STUB_NODE,
    LARGEST_FILES,
    immutableFiles,
    precachedStatic,
    staticFiles,
  } from './recorded-build';

  const shipped = BUILD_WITH_PLUGIN;
  const unfiltered = BUILD_WITHOUT_PLUGIN;

  const COMPARISON = [
    {
      label: 'Bytes on disk',
      before: byteFigure(unfiltered.bytes),
      after: byteFigure(shipped.bytes),
    },
    { label: 'Files', before: `${unfiltered.files}`, after: `${shipped.files}` },
    { label: 'Precache entries', before: `${unfiltered.precache}`, after: `${shipped.precache}` },
    {
      label: 'Precache download',
      before: byteFigure(unfiltered.precacheBytes),
      after: byteFigure(shipped.precacheBytes),
    },
    {
      label: 'Files index.html links',
      before: `${unfiltered.preloaded}, ${byteFigure(unfiltered.preloadedBytes)}`,
      after: `${shipped.preloaded}, ${byteFigure(shipped.preloadedBytes)}`,
    },
  ];
</script>

<DocsSection title={BUILD_SECTIONS.dokseoOutput}>
  <p>
    Dokseo is a SvelteKit app built with <code>@sveltejs/adapter-static</code>, so
    <code>vite build</code> writes a folder of static files to <code>build/</code> and nothing runs on
    a server. This is that folder, measured after a real build of this version of the code:
  </p>
  <DocsDemo label="Dokseo's build, recorded">
    <Table size="sm" caption="Files in build/, grouped by folder">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Folder</TableHeaderCell>
          <TableHeaderCell>Holds</TableHeaderCell>
          <TableHeaderCell>Files</TableHeaderCell>
          <TableHeaderCell>Size</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each shipped.groups as group (group.name)}
          <TableRow>
            <TableCell><code class="text-xs">{group.folder}</code></TableCell>
            <TableCell>{group.holds}</TableCell>
            <TableCell>{group.files}</TableCell>
            <TableCell>{byteFigure(group.bytes)}</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
    <Table size="sm" caption="The largest files">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>File</TableHeaderCell>
          <TableHeaderCell>Holds</TableHeaderCell>
          <TableHeaderCell>Size</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each LARGEST_FILES as file (file.path)}
          <TableRow>
            <TableCell><code class="text-xs">{file.path}</code></TableCell>
            <TableCell>{file.holds}</TableCell>
            <TableCell>{byteFigure(file.bytes)}</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
    {#snippet caption()}
      Recorded from <code>vite build</code> on this version of Dokseo by a script that walks
      <code>build/</code>, reads the precache list out of the built service worker and the preloads
      out of <code>index.html</code>. Unit tests check that the groups add up and that the counts
      that depend on the source tree still match it.
    {/snippet}
  </DocsDemo>
  <p>
    In total {exactBytes(shipped.bytes)} in {shipped.files} files. A first visit loads far less than that:
    the fallback <code>index.html</code> links {shipped.preloaded} files, {byteFigure(
      shipped.preloadedBytes,
    )}: the start script, the app, the root layout, the chunks they import and the global
    stylesheet. The rest arrives with the route that needs it, or never.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.dokseoDevOnly}>
  <p>
    Dokseo has three routes for development only: <code>/docs</code>, these pages;
    <code>/playground</code>, a gallery of the base components; and <code>/preview</code>, design
    comparisons. Each has a <code>+layout.ts</code> or <code>+page.ts</code> that responds with 404 outside
    the dev server:
  </p>
  <DocsCode label={DOCS_GUARD.label} code={DOCS_GUARD.code} />
  <p>
    That guard kept the pages from opening in production, but not from being built. SvelteKit makes
    a node for every route folder under <code>src/routes</code>, and I found no setting that leaves
    a route out. So every page here, its demos, a sample image and a demo worker were built, hashed
    and listed in the service worker's precache, and every installed copy of Dokseo downloaded them
    on each release.
  </p>
  <p>A small Vite plugin now empties those route components during a build:</p>
  <DocsCode label={DEV_ONLY_PLUGIN.label} code={DEV_ONLY_PLUGIN.code} />
  <DocsCode label={PLUGIN_ORDER.label} code={PLUGIN_ORDER.code} />
  <p>
    A <code>load</code> hook that returns a string replaces the file's contents for the rest of the
    build. Returning <code>''</code> for a <code>+page.svelte</code> or <code>+layout.svelte</code>
    under those three folders makes it an empty component, so nothing it imported enters the module graph.
    <code>apply: 'build'</code>
    leaves the dev server alone, and <code>enforce: 'pre'</code>
    with its place first in the list run its hook before any other plugin's <code>load</code>, so
    the Svelte compiler receives the empty text instead of the file. Any other file returns
    <code>null</code>, which passes it on to the next plugin.
  </p>
  <p>
    What still ships is small. SvelteKit's route table still names every route, and each emptied
    page is a stub node of {BUILT_STUB_NODE.length} bytes. They are all identical, so all
    {shipped.stubNodes} have the same hash in their names:
  </p>
  <DocsCode label="An emptied page node, as built" code={BUILT_STUB_NODE} />
  <p>
    The guards stay, because a <code>+page.ts</code> or <code>+layout.ts</code> is not emptied. In
    the build, <code>dev</code> is <code>false</code>, so the minifier has folded the condition away
    and the load function responds with 404 unconditionally:
  </p>
  <DocsCode label="The /docs layout node, as built" code={BUILT_GUARD_NODE} />
  <p>I measured the change in steps when I made it:</p>
  <Table size="sm" caption="Build size when the plugin was added">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Build</TableHeaderCell>
        <TableHeaderCell>Bytes</TableHeaderCell>
        <TableHeaderCell>Files</TableHeaderCell>
        <TableHeaderCell>Precache</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each BUILD_MILESTONES as milestone (milestone.label)}
        <TableRow>
          <TableCell>{milestone.label}</TableCell>
          <TableCell>{milestone.bytes.toLocaleString('en-US')}</TableCell>
          <TableCell>{milestone.files}</TableCell>
          <TableCell>{milestone.precache}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>Today's code, built with and without the plugin, gives the same picture:</p>
  <Table size="sm" caption="This version of Dokseo, built twice">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Measure</TableHeaderCell>
        <TableHeaderCell>Without the plugin</TableHeaderCell>
        <TableHeaderCell>With it</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each COMPARISON as row (row.label)}
        <TableRow>
          <TableCell>{row.label}</TableCell>
          <TableCell>{row.before}</TableCell>
          <TableCell>{row.after}</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  <p>
    The last row changed too, although no dev-only code was ever in the first load. With fewer
    entries reaching the shared modules in different combinations, the bundler groups them into
    fewer chunks, so <code>index.html</code> links fewer files with slightly fewer bytes.
  </p>
  <p>
    I considered rewriting the route table SvelteKit generates instead, so the routes would vanish
    completely. That would tie the build to the internal files of one SvelteKit version, while the
    plugin depends only on Vite's public <code>load</code> hook and on route file names. The other
    flag in the code, <code>import.meta.env.DEV</code> in the OCR pipeline's tracer, is the plain
    kind from <a href={buildHref('flags')}>Dead code behind a build flag</a>:
  </p>
  <DocsCode label={TRACE_GUARD.label} code={TRACE_GUARD.code} />
  <p>
    The tracer's <code>console.groupCollapsed</code> call does not appear anywhere in the build.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.dokseoLazy}>
  <p>
    pdf.js is the largest library Dokseo uses, and most books are image archives or EPUBs that never
    need it. The library adapter that opens a stored book imports each format's page source only
    when a book of that format opens:
  </p>
  <DocsCode label={STORED_PAGE_SOURCE.label} code={STORED_PAGE_SOURCE.code} />
  <p>
    Inside the PDF adapter, feature detection picks one of pdf.js's two builds (<a
      href={RENDERING_PDF_LOADING_HREF}>Loading pdf.js only for a PDF</a
    >).
    <code>pdfJsBuildFiles</code> returns a dynamic import of that build's library and the URL of its
    worker file, named with <code>new URL</code> and <code>import.meta.url</code>, so Vite emits the
    worker as a separate asset:
  </p>
  <DocsCode label={PDF_BUILD_FILES.label} code={PDF_BUILD_FILES.code} />
  <p>
    Both builds are in the output, each its own chunk with its own worker file, and a browser
    fetches one pair. That holds only while nothing else imports pdf.js. A dependency-cruiser rule,
    <code>only-the-pdf-adapter-loads-pdfjs</code>, fails the dependency check for an import of
    <code>pdfjs-dist</code> from any module but the adapter (the docs pages are exempt from every such
    rule):
  </p>
  <DocsCode label={PDF_RULE.label} code={PDF_RULE.code} />
  <p>
    Text recognition follows the same pattern. The composition root imports a recognizer adapter
    only when a capture in that language first needs it (<a href={ARCHITECTURE_LANGUAGES_HREF}
      >Recognizers loaded per language</a
    >):
  </p>
  <DocsCode label={RECOGNIZER_IMPORTS.label} code={RECOGNIZER_IMPORTS.code} />
  <p>
    Each adapter starts its worker by URL, so transformers.js and ONNX Runtime Web are bundled into
    the worker files, each about 600 kB, and never into a page chunk:
  </p>
  <DocsCode label={OCR_WORKER_START.label} code={OCR_WORKER_START.code} />
</DocsSection>

<DocsSection title={BUILD_SECTIONS.dokseoRuntime}>
  <p>
    The largest things recognition needs are not in the build at all. The model weights, about 123
    MB for manga-ocr, are downloaded from Hugging Face after the reader agrees, and transformers.js
    keeps them in the Cache API (<a href={OCR_CACHE_HREF}>The model cache and offline use</a>). The
    ONNX Runtime WebAssembly binary comes from jsDelivr: transformers.js sets that path itself when
    nothing else has (<a href={OCR_RUNTIME_HREF}>transformers.js and ONNX Runtime Web</a>):
  </p>
  <DocsCode label={WASM_PATHS.label} code={WASM_PATHS.code} />
  <p>
    Vite still wrote a copy of the <code>.wasm</code> file into the build, because ONNX Runtime's
    code names it with <code>new URL</code>, and Vite emits every file named that way. Nothing
    fetched that copy, and at 25.6 MiB it was over Cloudflare's limit of 25 MiB for one static
    asset, so a deploy failed. A second plugin deletes it from the bundle before anything is
    written:
  </p>
  <DocsCode label={RUNTIME_FROM_CDN.label} code={RUNTIME_FROM_CDN.code} />
  <p>
    <code>generateBundle</code> runs with the finished list of output files, and deleting a key from it
    means the file is never written. When I added it, the build went from 29 MB to 3.3 MB.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.dokseoCaching}>
  <p>
    Dokseo is served by Cloudflare, which reads response headers from <code>static/_headers</code>:
  </p>
  <DocsCode label={HEADERS.label} code={HEADERS.code} />
  <p>
    The first rule matches everything and sets <code>Cache-Control: no-cache</code>, so the browser
    revalidates before using a cached <code>index.html</code>, <code>service-worker.js</code> or
    <code>version.json</code>. Every file under <code>/_app/immutable/</code> has a content hash in
    its name, so its rule removes the inherited header (<code>! Cache-Control</code>) and caches it
    for a year without revalidation. A request that matches several rules gets the headers of all of
    them, which is why the removal is needed.
  </p>
  <p>
    The fonts get the same year, although their names in <code>static/fonts/</code> have no hash. That
    makes a font file's name its version: a changed font has to be saved under a new name, or browsers
    keep the old one for up to a year.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.dokseoPrecache}>
  <p>
    Dokseo's service worker precaches the app shell on install. SvelteKit's
    <code>$service-worker</code> module gives it <code>build</code>, every file Vite generated, and
    <code>files</code>, every file in <code>static/</code>; the worker keeps all of the first and
    the static files that match one pattern:
  </p>
  <DocsCode label={SHELL_ASSETS.label} code={SHELL_ASSETS.code} />
  <DocsCode label={SHELL_ASSET_LIST.label} code={SHELL_ASSET_LIST.code} />
  <DocsCode label={PRECACHE.label} code={PRECACHE.code} />
  <p>
    In this build that is {shipped.precache} URLs and {byteFigure(shipped.precacheBytes)}: the
    document, the {immutableFiles(shipped)} files under <code>_app/immutable/</code> and
    {precachedStatic(shipped)} of the {staticFiles(shipped)} files from <code>static/</code>, the
    fonts, icons and manifest. It includes both pdf.js builds and both OCR workers, though a device
    runs at most one of each pair. That is the cost of a precache that holds every chunk: splitting
    keeps the first load small, and the install still downloads everything once per release.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.dokseoBarrels}>
  <p>
    Dokseo has no barrel files: no <code>index.ts</code> anywhere re-exports a folder, and code
    imports the module that defines what it needs. The reason was first about boundaries (<a
      href={ARCHITECTURE_BARRELS_HREF}>No barrel files</a
    >): a domain's barrel re-exported its adapters, and dependency-cruiser checks imports module by
    module, so a route could reach an adapter through the barrel without breaking a rule. It is a
    build decision as well. Each of the icons in <code>src/lib/ui/components/icons/</code> is its
    own module, and the rule
    <code>icons-are-imported-one-by-one</code> forbids an <code>index</code> module there, so only the
    icons a screen names reach the build.
  </p>
</DocsSection>

<DocsSection title={BUILD_SECTIONS.rules}>
  <ul>
    <li>
      Load a heavy feature with <code>import()</code> where it is used, and check the build output after
      any change to the import that loads it.
    </li>
    <li>Import from the module that defines a name, never from a barrel.</li>
    <li>Keep top-level code free of effects, or accept that every importer pays for them.</li>
    <li>
      Put development-only code behind <code>import.meta.env.DEV</code> or <code>dev</code>, and
      keep development-only routes out of the module graph, not only behind a 404.
    </li>
    <li>
      Serve hashed files as immutable and the document as <code>no-cache</code>; give an unhashed
      file a new name when it changes.
    </li>
    <li>Fetch what is large and optional at run time, instead of bundling it.</li>
    <li>Remember the precache: every file the build writes is downloaded on every install.</li>
    <li>Measure the build, because a bigger bundle fails nothing.</li>
  </ul>
</DocsSection>
