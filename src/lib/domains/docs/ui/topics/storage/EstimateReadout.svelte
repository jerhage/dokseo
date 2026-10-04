<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import { isPersisted, storageEstimate } from '$lib/platform/storage/persistence';
  import { quotaShare, spaceFigure } from '../../../domain/storage-figures';
  import DocsDemo from '../../DocsDemo.svelte';

  async function readSpace() {
    const [space, persisted] = await Promise.all([storageEstimate(), isPersisted()]);
    return { space, persisted };
  }
</script>

<DocsDemo label="This origin, right now" resettable resetLabel="Measure again">
  {#await readSpace()}
    <p class="m-0 text-sm text-muted">Calling navigator.storage.estimate()…</p>
  {:then { space, persisted }}
    {#if space === null}
      <p class="m-0 text-sm">This browser reports no estimate.</p>
    {:else}
      <p class="row wrap items-center gap-2 m-0 text-sm">
        <code>usage</code>
        <Badge>{spaceFigure(space.usage)}</Badge>
        <code>quota</code>
        <Badge>{spaceFigure(space.quota)}</Badge>
        <span>used</span>
        <Badge>{quotaShare(space.usage, space.quota)}</Badge>
      </p>
      <Progress
        label="Usage as a share of the quota"
        value={space.usage}
        max={space.quota}
        size="sm"
      />
    {/if}
    <p class="row wrap items-center gap-2 m-0 text-sm">
      <code>navigator.storage.persisted()</code>
      <Badge variant={persisted ? 'success' : 'warning'}>{persisted}</Badge>
    </p>
  {/await}
  {#snippet caption()}
    Read from this page as it runs, through the same functions Dokseo's storage screen calls. The
    figures cover every store of this origin together.
  {/snippet}
</DocsDemo>
