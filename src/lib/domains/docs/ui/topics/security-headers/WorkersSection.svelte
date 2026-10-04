<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { BLOB_WORKER_SOURCE } from './probes';
  import { SECTIONS, sectionHref } from './sections';
  import WorkerProbe from './WorkerProbe.svelte';
</script>

<DocsSection title={SECTIONS.workers}>
  <p>
    A worker runs a script in its own global scope, off the main thread. It has its own policy
    container: its own list of CSP policies and its own embedder policy. The HTML standard fills
    that container from the worker's URL:
  </p>
  <ul>
    <li>
      A worker started from a file, as in <code>new Worker('/worker.js')</code>, gets its policies
      from that script's response headers. The page's CSP does not reach it.
    </li>
    <li>
      A worker started from a <code>blob:</code> URL gets a copy of the policies of the document that
      minted the blob URL.
    </li>
  </ul>
  <p>
    Isolation passes down with a stricter rule. When the page sends
    <code>Cross-Origin-Embedder-Policy: require-corp</code>, a dedicated worker's own response must
    have a compatible embedder policy as well, or the worker fails to load. So a worker file needs
    the isolation headers on its own response, the same as the page.
  </p>
  <p>
    The probe below runs one check in three places: whether the context is isolated, and whether
    <code>new Function</code> runs. The blob worker's whole script is this text:
  </p>
  <DocsCode label="The blob worker's source" code={BLOB_WORKER_SOURCE} />
  <DocsDemo label="Page, blob worker, file worker">
    <WorkerProbe />
    {#snippet caption()}
      The file worker is a module in Dokseo's source tree with the same check, served by the same
      server as this page.
    {/snippet}
  </DocsDemo>
  <p>
    The last row is the one that matters for Dokseo. The page blocks <code>new Function</code>; the
    worker started from a file runs it, because the worker script's response carried no CSP header.
    Dokseo's OCR workers are files like that, so the page's <code>script-src</code> and
    <code>connect-src</code> do not govern them. The section on
    <a href={sectionHref('downloads')}>model downloads</a> follows what that means.
  </p>
</DocsSection>
