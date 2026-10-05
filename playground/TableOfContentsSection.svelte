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
    repeated one: {ENTRIES.map((entry) => entry.href).join(', ')}.
  </p>
  <Card class="w-sm">
    <TableOfContents entries={ENTRIES} heading="h3" />
  </Card>
</DemoSection>
