<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import { browserFileSaving, saveFile } from '$lib/platform/files/save-file';
  import { CapturesExportView, exportStatus } from './captures-export.svelte';
  import type { CapturesExporting } from './captures-export.svelte';
  import type { CapturesImporting } from './captures-import.svelte';
  import CapturesImport from './CapturesImport.svelte';

  type Props = { readonly data: CapturesExporting & CapturesImporting };

  let { data }: Props = $props();

  const saving = browserFileSaving();
  const view = new CapturesExportView({ exportCaptures: () => data.exportCaptures() }, (file) =>
    saveFile(saving, file),
  );
  const exporting = $derived(view.state.kind === 'exporting');
  const awaitingTap = $derived(view.state.kind === 'needs-another-tap');
  const status = $derived(exportStatus(view.state));
</script>

<div class="col gap-6 prose">
  <header class="col gap-1">
    <h1 class="text-lg">Your data</h1>
    <p class="text-sm text-muted">
      Save your captures to a file, or load them from one, to keep a copy or move them between
      devices. Book files are not included.
    </p>
  </header>

  <ListGroup title="Export">
    <ListRow
      title="Captures"
      description="Every capture, its tags and the books it belongs to, in one file."
    >
      {#snippet actions()}
        <Button
          size="sm"
          variant="outline"
          loading={exporting}
          disabled={exporting || awaitingTap}
          onclick={() => view.export()}
        >
          Export all captures
        </Button>
      {/snippet}
    </ListRow>
  </ListGroup>

  {#if status !== null}
    {#if awaitingTap}
      <Alert variant={status.variant} title={status.message}>
        {#snippet actions()}
          <Button size="sm" variant="primary" onclick={() => view.saveAgain()}>Save file</Button>
        {/snippet}
      </Alert>
    {:else if status.notes.length === 0}
      <Alert variant={status.variant} title={status.message} />
    {:else}
      <Alert variant={status.variant} title={status.message}>
        <ul class="col gap-1">
          {#each status.notes as note (note)}
            <li>{note}</li>
          {/each}
        </ul>
      </Alert>
    {/if}
  {/if}

  <CapturesImport {data} />
</div>
