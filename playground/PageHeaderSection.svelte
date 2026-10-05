<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import PageHeader from '../components/PageHeader.svelte';
  import Toggle from '../components/Toggle.svelte';
  import DemoSection from './DemoSection.svelte';

  let compact = $state(false);
</script>

<DemoSection id="page-header" title="Page header" classes={['page-header']}>
  <p class="text-sm text-muted">
    A back link, the page's title and a meta line. It adds no box of its own: its parts join the
    caller's row, which places them beside its own controls.
  </p>
  <Toggle bind:checked={compact}>Compact back link</Toggle>
  <Card>
    <div class="row items-center gap-2 wrap">
      <PageHeader
        backHref="#page-header"
        backLabel="Library"
        {compact}
        title="An exceedingly long volume title that truncates"
        meta="Chapter 3 · page 41 of 212"
      />
      <Button size="sm" class="shrink-0">Settings</Button>
    </div>
  </Card>
  <Card>
    <div class="row items-center gap-2 wrap">
      <PageHeader title="月の本" lang="ja" meta="No back link, the title in its own language" />
    </div>
  </Card>
</DemoSection>
