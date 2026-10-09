<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Dropzone from '$lib/ui/components/Dropzone.svelte';
  import Fieldset from '$lib/ui/components/Fieldset.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import Radio from '$lib/ui/components/Radio.svelte';
  import type { FileSelection } from '$lib/ui/components/file-selection';
  import { resolutionOf } from './captures-import-rules';
  import { CapturesImport } from './captures-import.svelte';
  import type { CapturesImporting, ImportFile } from './captures-import.svelte';
  import {
    STRATEGY_OPTIONS,
    importStatus,
    nothingToWrite,
    previewRows,
    unreadableLines,
  } from './captures-import-text';
  import { createConflictReview } from './conflict-review.svelte';
  import ConflictReview from './ConflictReview.svelte';

  type Props = { readonly data: CapturesImporting };

  let { data }: Props = $props();

  const uid = $props.id();
  const client = useQueryClient();
  const write = new CapturesImport(
    {
      previewCapturesImport: (text) => data.previewCapturesImport(text),
      applyCapturesImport: (plan, resolution) => data.applyCapturesImport(plan, resolution),
    },
    () => client.invalidateQueries(),
  );

  const review = createConflictReview();

  const status = $derived(importStatus(write.state));
  const planned = $derived(write.state.kind === 'preview' ? write.state : null);
  const busy = $derived(write.state.kind === 'reading' || write.state.kind === 'importing');
  const editing = $derived(review.draft !== null);

  async function choose(selection: FileSelection<ImportFile>): Promise<void> {
    review.reset();
    await write.choose(selection);
  }

  function cancel(): void {
    review.reset();
    write.cancel();
  }

  async function importNow(): Promise<void> {
    await write.importNow(resolutionOf(review.strategy, review.choices));
  }
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
        onfiles={(selection) => choose(selection)}
      >
        {#snippet title()}
          {#if write.state.kind === 'reading'}
            Reading…
          {:else if write.state.kind === 'importing'}
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
        <Button size="sm" variant="outline" onclick={cancel}>Close</Button>
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
              group={review.strategy}
              hint={option.hint}
              onchange={() => review.pickStrategy(option.strategy)}
            >
              {option.label}
            </Radio>
          {/each}
        </div>
      </Fieldset>
    {/if}

    {#if review.strategy === 'review'}
      <ConflictReview plan={planned.plan} {review} />
    {/if}

    <div class="row wrap justify-end gap-2">
      <Button size="sm" variant="ghost" onclick={cancel}>Cancel</Button>
      <Button size="sm" variant="primary" disabled={editing} onclick={importNow}>Import</Button>
    </div>
  {/if}
{/if}
