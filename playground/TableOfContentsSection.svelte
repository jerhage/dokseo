<script lang="ts">
  import Card from '../components/Card.svelte';
  import TableOfContents from '../components/TableOfContents.svelte';
  import { contentsEntries } from '../components/table-of-contents';
  import DemoSection from './DemoSection.svelte';

  const ENTRIES = contentsEntries([
    { title: 'What the headers do' },
    { title: 'Cross-origin isolation' },
    { title: 'Why SharedArrayBuffer needs it', level: 3 },
    { title: 'Example' },
    { title: 'Example' },
  ]);

  const BODIES = [
    'Two response headers decide which documents may embed this page and which resources it may load from other origins.',
    'A page served with both headers runs in its own browsing context group, cut off from windows of other origins.',
    'Shared memory between threads makes precise timers possible, so the browser hands it only to an isolated page.',
    'A worker posts a SharedArrayBuffer to the page, and both read and write the same bytes without copying them.',
    'A second example with the same title takes the anchor example-2, so each link still reaches its own heading.',
  ];

  let current = $state<string>();
</script>

<DemoSection
  id="table-of-contents"
  title="Table of contents"
  classes={[
    'table-of-contents',
    'table-of-contents-title',
    'table-of-contents-list',
    'table-of-contents-item-nested',
    'table-of-contents-link',
  ]}
>
  <p class="text-sm text-muted">
    An "On this page" list. <code>contentsEntries</code> turns headings into anchors, numbering a
    repeated one: {ENTRIES.map((entry) => entry.href).join(', ')}. As the page scrolls through the
    sections beside it, the entry of the heading being read takes
    <code>aria-current="location"</code>
    (now: {current ?? 'none'}).
  </p>
  <div class="layout-sidebar">
    <div class="layout-sidebar-aside">
      <Card>
        <TableOfContents entries={ENTRIES} heading="h3" bind:current />
      </Card>
    </div>
    <div class="layout-sidebar-content">
      {#each ENTRIES as entry, index (entry.id)}
        <section class="stack-sm min-h-screen">
          <svelte:element this={entry.level === 3 ? 'h4' : 'h3'} id={entry.id}
            >{entry.title}</svelte:element
          >
          <p class="prose text-muted">{BODIES[index]}</p>
        </section>
      {/each}
    </div>
  </div>
</DemoSection>
