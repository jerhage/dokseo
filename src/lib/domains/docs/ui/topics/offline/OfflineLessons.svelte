<script lang="ts">
  import StepItem from '$lib/ui/components/StepItem.svelte';
  import StepList from '$lib/ui/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { CONNECTION_MESSAGE } from './offline-snippets';
  import { OFFLINE_SECTIONS, offlineHref } from './sections';

  const HOST_RULES = `--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost`;

  const PDF_FAILURE = `Setting up fake worker failed: "error loading dynamically imported module: https://10.10.1.115:4173/_app/immutable/assets/pdf.worker.min.Dswkl-cV.mjs".`;
</script>

<DocsSection title={OFFLINE_SECTIONS.models}>
  <p>
    The OCR models never pass through the shell cache. Their files come from
    <code>huggingface.co</code> and the runtime from <code>cdn.jsdelivr.net</code>, both other
    origins, so the service worker lets those requests through. transformers.js stores every file it
    downloads in its own Cache API cache, <code>transformers-cache</code>, and reads that cache
    before it fetches, which is what lets OCR run offline.
    <a href="/docs/ocr#the-model-cache-and-offline-use">The model cache and offline use</a> on the OCR
    page covers that cache, and the Korean dictionary file that Safari did not serve from its HTTP cache
    until Dokseo stored it next to the weights.
  </p>
  <p>
    Two facts from that page matter for offline work. The Cache API belongs to an origin, so
    <code>localhost:5173</code>, a preview build on port 4173, the same build on the machine's LAN
    address, and the deployed site each need their own download. And a model that is missing from
    this origin's cache fails offline with <q>Failed to fetch</q> or
    <q>no available backend found</q>, which says nothing about the cause. When any request of a
    model load is rejected with a <code>TypeError</code>, the error is a network failure, and if the
    load then fails, both OCR workers replace the message:
  </p>
  <DocsCode label={CONNECTION_MESSAGE.file} code={CONNECTION_MESSAGE.code} />
  <p>
    The full message adds the URL that failed and the library's own error, which is how the missing
    dictionary file was found.
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.testing}>
  <p>
    Offline is a condition of the whole device, and every tool that imitates it imitates a different
    part. A test result says something only about the method that produced it.
  </p>
  <StepList>
    <StepItem title="DevTools Offline is not Wi-Fi off">
      I tested a built copy, served by <code>vite preview</code> over HTTPS at the LAN address, with
      Chrome DevTools' network throttling set to Offline. Opening a PDF failed:
      <DocsCode label="The error" code={PDF_FAILURE} />
      The pdf.js worker file named there was in the precache list in
      <code>build/service-worker.js</code>, and the new version was active. With throttling off,
      Wi-Fi off and the preview server stopped, the same PDF opened. I have not found the cause, and
      changed nothing for it: offline use is checked with the network actually gone.
    </StepItem>
    <StepItem title="Playwright's offline switch is a third condition">
      In Chromium, <code>context.setOffline(true)</code> sends the DevTools protocol command
      <code>Network.emulateNetworkConditions</code> with <code>offline: true</code>, and Playwright
      1.63 sends it only to page sessions, skipping worker targets. In my runs it also cut off
      <code>localhost</code>, so a page on the dev server could not load its own chunks. To cut off
      remote hosts and keep the local server, I launch a persistent Chromium context with:
      <DocsCode label="Chromium flag" code={HOST_RULES} />
    </StepItem>
    <StepItem title="WebKit's setOffline breaks service worker navigations">
      In Playwright's WebKit, <code>setOffline(true)</code> made navigations fail that the service
      worker serves from its cache. Stopping the static server gives the real offline case instead.
      And a context created with <code>serviceWorkers: 'block'</code> makes
      <code>register()</code> resolve to <code>undefined</code>, so the service worker code never
      runs at all.
    </StepItem>
    <StepItem title="Each origin is its own device">
      A model downloaded on <code>localhost:5173</code> does not exist for the preview build, as
      <a href={offlineHref('models')}>model files offline</a> explains. An offline test of OCR starts
      with one successful recognition online, in the same origin.
    </StepItem>
  </StepList>
  <p>
    The rule I follow: reproduce an offline report with the reporter's exact method, browser, build
    and origin, and name the method next to every result.
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.rules}>
  <ul>
    <li>
      Precache <code>/</code>, never <code>/index.html</code>, and never a file the host does not
      serve.
    </li>
    <li>
      Open the shell cache by name and match there. Never call the global
      <code>caches.match()</code>, and delete only names with the <code>reader-shell-</code> prefix.
    </li>
    <li>Name the shell cache after <code>kit.version</code>, which changes on every build.</li>
    <li>
      Serve navigations network first with a 3 second limit, and never cache the network's response.
    </li>
    <li>
      Reload only after the reader taps Reload, and only on the <code>controllerchange</code> that follows.
    </li>
    <li>Check for updates when the app becomes visible and on a timer, silently when offline.</li>
    <li>Keep every file the app needs offline in the Cache API, never only in the HTTP cache.</li>
    <li>Test offline with the network actually gone, in the origin that will be used.</li>
  </ul>
</DocsSection>
