<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import {
    CACHE_FIRST_RESPONSE,
    INSTALL_ACTIVATE,
    LIFECYCLE_LISTENERS,
    NAVIGATION_RESPONSE,
    SHELL_ASSETS,
    SHELL_ROUTE,
  } from './offline-snippets';
  import { OFFLINE_SECTIONS, offlineHref } from './sections';
  import StrategySimulator from './StrategySimulator.svelte';
  import WorkerReadout from './WorkerReadout.svelte';

  const KIT_OPTION = `serviceWorker: { register: false },`;
</script>

<DocsSection title={OFFLINE_SECTIONS.shell}>
  <p>
    Dokseo is a static single-page app: one HTML document, the scripts, styles and fonts Vite
    builds, and the icons and manifest in <code>static/</code>. Together they are the app shell. The
    books, captures and model weights already live on the device, in IndexedDB, the origin private
    file system and the Cache API, so the shell was the one part that still needed the network.
  </p>
  <p>
    SvelteKit builds <code>src/service-worker.ts</code> into <code>/service-worker.js</code> and
    gives it a module, <code>$service-worker</code>, with the lists a precache needs:
    <code>build</code>, every file Vite wrote; <code>files</code>, every file in
    <code>static/</code>; and <code>version</code>, a name for this build. The Kit option in
    <code>vite.config.ts</code> turns off Kit's own registration, so the root layout registers it
    instead, and only when <code>dev</code> is false:
  </p>
  <DocsCode label="vite.config.ts, the Kit option" code={KIT_OPTION} />
  <p>
    The worker file itself is wiring. Every decision is a pure function in
    <code>src/lib/platform/service-worker/</code>, unit tested without a browser. The install step
    precaches a list built from those inputs into one cache, named
    <code>reader-shell-</code> plus the version:
  </p>
  <DocsCode label={SHELL_ASSETS.file} code={SHELL_ASSETS.code} />
  <p>Each rule in that list comes from a failure.</p>
  <ul>
    <li>
      It holds <code>/</code>, not <code>/index.html</code>. The host, Cloudflare, responds to
      <code>/index.html</code> with a 307 redirect to <code>/</code>. A navigation request has the
      redirect mode <code>manual</code>, and the Fetch standard turns a redirected response from a
      service worker into a network error for such a request, so a cached
      <code>/index.html</code> would break every offline page load.
    </li>
    <li>
      It filters <code>static/</code> by extension. <code>files</code> includes
      <code>_headers</code>, the host's header rules, which the host never serves: a request for it
      gets a 404. <code>cache.addAll()</code> rejects the whole batch when one response is not a success,
      so that one file would fail every install.
    </li>
    <li>
      The cache stores whole responses, headers included. A page served from it still gets the
      <code>Cross-Origin-Opener-Policy</code> and <code>Cross-Origin-Embedder-Policy</code> headers
      it was precached with, so it stays
      <a href="/docs/security-headers#cross-origin-isolation">cross-origin isolated</a> offline.
    </li>
  </ul>
  <DocsCode label={INSTALL_ACTIVATE.file} code={INSTALL_ACTIVATE.code} />
  <DocsCode label={LIFECYCLE_LISTENERS.label} code={LIFECYCLE_LISTENERS.code} />
  <p>
    The activate step deletes only caches whose name starts with <code>reader-shell-</code> and
    differs from this build's. The origin holds other caches: transformers.js keeps the OCR models
    in a cache named <code>transformers-cache</code>. For the same reason every lookup opens the
    shell cache by name and matches there, never with the global <code>caches.match()</code>, which
    would search the model cache too. Then <code>clients.claim()</code> makes the new worker control the
    open pages at once.
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.routing}>
  <p>
    The <code>fetch</code> handler passes each request to one pure function, which returns a route:
    a union of three named kinds. The handler acts on it with <code>match(...).exhaustive()</code>.
  </p>
  <DocsCode label={SHELL_ROUTE.file} code={SHELL_ROUTE.code} />
  <ul>
    <li>
      <code>pass-through</code>: anything but <code>GET</code>, anything from another origin, and
      same-origin files outside the shell, such as <code>/_app/version.json</code>. The handler does
      not call <code>respondWith</code>, so model downloads from <code>huggingface.co</code> and the
      ONNX Runtime from <code>cdn.jsdelivr.net</code> reach the network untouched.
    </li>
    <li>
      <code>cache-first</code>: a file under <code>/_app/immutable/</code> or any precached path. A
      miss goes to the network, and a <code>200</code> response is kept for next time.
    </li>
    <li>
      <code>network-first</code>: every navigation. The network gets 3 seconds; after that, or at
      once if the request fails, the cached <code>/</code> is served. That document is the SPA fallback,
      so it loads the app, and the client router renders whichever screen the URL names. The network's
      response to a navigation is never written into the cache.
    </li>
  </ul>
  <DocsCode label={NAVIGATION_RESPONSE.label} code={NAVIGATION_RESPONSE.code} />
  <p>
    If the 3 seconds pass and no shell is cached, the handler keeps waiting for the same network
    request instead of failing early. <code>cacheFirstResponse</code> is shorter:
  </p>
  <DocsCode label={CACHE_FIRST_RESPONSE.label} code={CACHE_FIRST_RESPONSE.code} />
  <StrategySimulator />
  <p>
    A pass-through request offline fails like any request with no network. That is the right result
    for a model file only because transformers.js reads its own cache before it fetches, as
    <a href={offlineHref('models')}>model files offline</a> covers.
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.readout}>
  <p>
    This readout reads the registration and Cache Storage for the origin this page runs on, and
    changes nothing.
  </p>
  <WorkerReadout />
</DocsSection>
