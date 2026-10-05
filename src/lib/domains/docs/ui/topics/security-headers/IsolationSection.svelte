<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import type { DiagramBox } from '$lib/ui/components/diagram';
  import Figure from '$lib/ui/components/Figure.svelte';
  import { onnxDefaultThreads } from '../../../domain/security-headers';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { SECTIONS, sectionHref } from './sections';

  const HEADERS = `Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp`;

  const server: DiagramBox = { kind: 'box', x: 80, y: 8, width: 200, height: 44, label: 'Server' };
  const response: DiagramBox = {
    kind: 'box',
    x: 80,
    y: 92,
    width: 200,
    height: 52,
    label: 'Response',
    detail: 'COOP and COEP headers',
    tone: 'accent',
  };
  const page: DiagramBox = {
    kind: 'box',
    x: 80,
    y: 184,
    width: 200,
    height: 52,
    label: 'Page',
    detail: 'crossOriginIsolated',
    tone: 'primary',
  };
  const memory: DiagramBox = {
    kind: 'box',
    x: 80,
    y: 276,
    width: 200,
    height: 52,
    label: 'Threads',
    detail: 'SharedArrayBuffer',
  };
</script>

<DocsSection title={SECTIONS.isolation}>
  <p>
    Spectre, disclosed in January 2018, showed that a script can read memory it was never given by
    timing how fast the processor reaches it. The attack needs a precise clock. Shared memory makes
    one: a worker adds one to a number in a loop while another thread reads the number. So browsers
    disabled <code>SharedArrayBuffer</code>, the JavaScript object for memory shared between
    threads, early in 2018, and in 2020 brought it back only for pages that are
    <em>cross-origin isolated</em>.
  </p>
  <p>
    In an isolated page, no document from another origin shares its browsing context group, and
    nothing from another origin is embedded in it without agreeing to be. Two response headers make
    a page isolated:
  </p>
  <DocsCode label="The two headers" code={HEADERS} />
  <ul>
    <li>
      <code>Cross-Origin-Opener-Policy: same-origin</code> (COOP) puts the page in its own browsing
      context group. When a page from another origin opens it with <code>window.open()</code>, that
      page gets no handle to it, and windows this page opens on other origins are cut off the same
      way.
    </li>
    <li>
      <code>Cross-Origin-Embedder-Policy: require-corp</code> (COEP) covers everything the page
      embeds: every image, script, frame and request from another origin must opt in, as described
      in <a href={sectionHref('embedder')}>responses under require-corp</a>.
    </li>
  </ul>
  <p>
    With both in place, <code>crossOriginIsolated</code> is <code>true</code> in the page and in its
    workers, <code>SharedArrayBuffer</code> is defined, and shared memory can be posted to a worker.
    Without them, in Chromium and WebKit, the global is <code>undefined</code> and posting shared
    memory to a worker throws a <code>DataCloneError</code>.
  </p>
  <Figure>
    <Diagram
      label="The server sends a response with COOP and COEP, the page becomes cross-origin isolated, and its threads can share a SharedArrayBuffer"
      width={360}
      height={336}
      nodes={[server, response, page, memory]}
      edges={[
        { from: server, to: response },
        { from: response, to: page, label: 'isolates' },
        { from: page, to: memory, label: 'allows' },
      ]}
    />
    {#snippet caption()}From the response headers to shared memory.{/snippet}
  </Figure>
  <p>
    WebAssembly threads are built on this. A multithreaded WebAssembly module runs in several
    workers that all use one <code>WebAssembly.Memory</code> created with
    <code>shared: true</code>. Each worker receives that memory through <code>postMessage</code>, so
    without isolation the threads cannot start. ONNX Runtime Web, which runs Dokseo's OCR models,
    picks its thread count when it starts: one thread if <code>crossOriginIsolated</code> is false, otherwise
    half the reported cores, rounded up, up to four. With more than one thread it splits heavy operations,
    such as matrix multiplication, across cores.
  </p>
  <DocsDemo label="This page" resettable resetLabel="Check again">
    <p class="row wrap items-center gap-2 m-0">
      <code>crossOriginIsolated</code>
      <Badge variant={crossOriginIsolated ? 'success' : 'warning'}>{crossOriginIsolated}</Badge>
    </p>
    <p class="row wrap items-center gap-2 m-0">
      <code>typeof SharedArrayBuffer</code>
      <Badge>{typeof SharedArrayBuffer}</Badge>
    </p>
    <p class="row wrap items-center gap-2 m-0">
      <code>navigator.hardwareConcurrency</code>
      <Badge>{navigator.hardwareConcurrency}</Badge>
    </p>
    <p class="row wrap items-center gap-2 m-0">
      ONNX Runtime Web's default thread count here
      <Badge variant="primary">
        {onnxDefaultThreads(crossOriginIsolated, navigator.hardwareConcurrency)}
      </Badge>
    </p>
    {#snippet caption()}Read from this page as it runs.{/snippet}
  </DocsDemo>
</DocsSection>
