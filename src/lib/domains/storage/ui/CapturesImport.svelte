<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import Dropzone from '$lib/components/Dropzone.svelte';
  import Fieldset from '$lib/components/Fieldset.svelte';
  import ListGroup from '$lib/components/ListGroup.svelte';
  import ListRow from '$lib/components/ListRow.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import { CapturesImportView } from './captures-import.svelte';
  import type { CapturesImporting } from './captures-import.svelte';
  import {
    STRATEGY_OPTIONS,
    importStatus,
    nothingToWrite,
    previewRows,
    unreadableLines,
  } from './captures-import-text';

  type Props = { readonly data: CapturesImporting };

  let { data }: Props = $props();

  const uid = $props.id();
  const client = useQueryClient();
  const view = new CapturesImportView(
    {
      previewCapturesImport: (text) => data.previewCapturesImport(text),
      applyCapturesImport: (plan, resolution) => data.applyCapturesImport(plan, resolution),
    },
    () => client.invalidateQueries(),
  );

  const status = $derived(importStatus(view.state));
  const planned = $derived(
    view.state.kind === 'preview' || view.state.kind === 'reviewing' ? view.state : null,
  );
  const busy = $derived(view.state.kind === 'reading' || view.state.kind === 'importing');
  const editing = $derived(view.state.kind === 'reviewing' && view.state.draft !== null);
</script>

<ListGroup title="Import">
  <ListRow
    title="Captures"
    description="Add the captures from an exported file. Nothing changes until you confirm."
  >
    {#if planned === null}
      <Dropzone
        size="sm"
        accept="application/json,.json"
        disabled={busy}
        hint="A file from Export all captures"
        onfiles={(selection) => view.choose(selection)}
      >
        {#snippet title()}
          {#if view.state.kind === 'reading'}
            Reading…
          {:else if view.state.kind === 'importing'}
            Importing…
          {:else}
            Drop a captures file here or <span class="dropzone-action">browse</span>
          {/if}
        {/snippet}
      </Dropzone>
    {/if}
  </ListRow>
</ListGroup>

{#if status !== null}
  {#if status.notes.length === 0}
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

{#if planned !== null}
  {@const summary = planned.plan.summary}
  {@const unreadable = unreadableLines(planned.plan.unreadable, summary.droppedTags)}
  <ListGroup title="In this file">
    {#each previewRows(summary) as row (row.title)}
      <ListRow title={row.title} description={row.description} value={row.value} />
    {/each}
  </ListGroup>

  {#if unreadable.length > 0}
    <Alert variant="warning" title="These entries could not be read and will be skipped.">
      <ul class="col gap-1">
        {#each unreadable as line, index (index)}
          <li>{line}</li>
        {/each}
      </ul>
    </Alert>
  {/if}

  {#if nothingToWrite(summary)}
    <Alert variant="info" title="Everything in this file is already here.">
      {#snippet actions()}
        <Button size="sm" variant="outline" onclick={() => view.cancel()}>Close</Button>
      {/snippet}
    </Alert>
  {:else}
    {#if summary.conflicts > 0}
      <Fieldset legend="When a capture differs">
        <div class="col gap-3">
          {#each STRATEGY_OPTIONS as option (option.strategy)}
            <Radio
              name="{uid}-strategy"
              value={option.strategy}
              group={view.strategy}
              hint={option.hint}
              onchange={() => view.pickStrategy(option.strategy)}
            >
              {option.label}
            </Radio>
          {/each}
        </div>
      </Fieldset>
    {/if}

    <div class="row wrap justify-end gap-2">
      <Button size="sm" variant="ghost" onclick={() => view.cancel()}>Cancel</Button>
      <Button size="sm" variant="primary" disabled={editing} onclick={() => view.importNow()}>
        Import
      </Button>
    </div>
  {/if}
{/if}
