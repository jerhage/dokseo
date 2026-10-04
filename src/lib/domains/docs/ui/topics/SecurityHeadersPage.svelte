<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Diagram from '$lib/components/Diagram.svelte';
  import type { DiagramBox } from '$lib/components/diagram';
  import Figure from '$lib/components/Figure.svelte';
  import DocsCode from '../DocsCode.svelte';
  import DocsDemo from '../DocsDemo.svelte';
  import DocsPage from '../DocsPage.svelte';
  import DocsSection from '../DocsSection.svelte';

  const SECTIONS = { isolation: 'Cross-origin isolation', check: 'Check this page' } as const;

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

<DocsPage slug="security-headers" sections={Object.values(SECTIONS)}>
  {#snippet lead()}
    Two response headers decide whether a page may share memory between threads.
  {/snippet}

  <DocsSection title={SECTIONS.isolation}>
    <p>
      A page is cross-origin isolated when its response sets <code>Cross-Origin-Opener-Policy</code>
      to <code>same-origin</code> and <code>Cross-Origin-Embedder-Policy</code> to
      <code>require-corp</code>. Only then does the browser define <code>SharedArrayBuffer</code>,
      the memory that WebAssembly threads share.
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
    <DocsCode label="The two headers" code={HEADERS} />
  </DocsSection>

  <DocsSection title={SECTIONS.check}>
    <DocsDemo resettable resetLabel="Check again">
      <p class="row wrap items-center gap-2 m-0">
        <code>crossOriginIsolated</code>
        <Badge variant={crossOriginIsolated ? 'success' : 'warning'}>{crossOriginIsolated}</Badge>
      </p>
      <p class="row wrap items-center gap-2 m-0">
        <code>typeof SharedArrayBuffer</code>
        <Badge>{typeof SharedArrayBuffer}</Badge>
      </p>
      {#snippet caption()}Read from this page as it runs.{/snippet}
    </DocsDemo>
  </DocsSection>
</DocsPage>
