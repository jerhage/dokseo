<script lang="ts">
  import { onMount } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { QUERY_PRESETS, queryPreset } from '../../../domain/indexeddb-samples';
  import type { QueryPresetKey } from '../../../domain/indexeddb-samples';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { QueryLab } from './query-lab.svelte';
  import {
    SCRATCH_NAME,
    addWithClash,
    deleteScratch,
    fillSamples,
    moveBook,
    runPreset,
    scratchCounts,
    scratchExists,
  } from './scratch-idb';

  const lab = new QueryLab({
    exists: scratchExists,
    counts: scratchCounts,
    fill: fillSamples,
    run: runPreset,
    clash: addWithClash,
    move: moveBook,
    remove: () => deleteScratch(),
  });

  const state = $derived(lab.state);
  const ready = $derived(state.kind === 'ready');
  const preset = $derived(queryPreset(lab.preset));
  const shown = $derived(lab.shown);

  function isPresetKey(value: string): value is QueryPresetKey {
    return QUERY_PRESETS.some((candidate) => candidate.key === value);
  }

  function choose(event: Event & { currentTarget: HTMLSelectElement }): void {
    const value = event.currentTarget.value;
    if (isPresetKey(value)) void lab.choose(value);
  }

  onMount(() => {
    void lab.refresh();
  });
</script>

<DocsDemo label="Stores, indexes, ranges and cursors">
  {#snippet caption()}
    Everything runs in this browser on a database named <code>{SCRATCH_NAME}</code>, which only the
    demos on this page use. Dokseo's own databases are never opened.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap gap-2">
      <Button size="sm" variant="primary" disabled={lab.busy} onclick={() => void lab.fill()}>
        {ready ? 'Refill the sample rows' : 'Create and fill'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={lab.busy || !ready}
        onclick={() => void lab.clash()}>Add two books, one with a taken hash</Button
      >
      <Button
        size="sm"
        variant="outline"
        disabled={lab.busy || !ready}
        onclick={() => void lab.move('b2', 'b1')}>Move b2's captures to b1</Button
      >
      <Button
        size="sm"
        variant="ghost-danger"
        disabled={lab.busy || !ready}
        onclick={() => void lab.remove()}>Delete the demo database</Button
      >
    </div>

    {#if state.kind === 'failed'}
      <Alert variant="danger" title="The demo database failed">{state.message}</Alert>
    {:else if state.kind === 'absent'}
      <p class="m-0 text-sm text-muted">The demo database does not exist on this device yet.</p>
    {:else if state.kind === 'ready'}
      <p class="m-0 text-sm text-muted">
        <code>books</code> holds {state.counts.books} records, <code>captures</code>
        {state.counts.captures}.
      </p>
    {/if}

    {#if lab.log.length > 0}
      <ul class="m-0 text-sm">
        {#each lab.log as line, index (index)}
          <li>{line}</li>
        {/each}
      </ul>
    {/if}

    <Field label="Query">
      {#snippet children(control)}
        <Select {...control} value={lab.preset} onchange={choose}>
          {#each QUERY_PRESETS as option (option.key)}
            <option value={option.key}>{option.label}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <DocsCode label="The request" code={preset.code} />
    <p class="m-0 text-sm">{preset.order}</p>

    {#if ready && shown !== null && shown.preset === lab.preset}
      {#if shown.result.kind === 'count'}
        <p class="m-0">The request's result: <strong>{shown.result.count}</strong></p>
      {:else}
        <Table size="sm" caption="Records in the order the request returned them">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>#</TableHeaderCell>
              <TableHeaderCell>key</TableHeaderCell>
              <TableHeaderCell>primary key</TableHeaderCell>
              <TableHeaderCell>value</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each shown.result.rows as row (row.step)}
              <TableRow>
                <TableCell>{row.step}</TableCell>
                <TableCell><code>{row.key}</code></TableCell>
                <TableCell>{row.primaryKey}</TableCell>
                <TableCell class="text-sm">{row.value ?? 'not read: a key cursor'}</TableCell>
              </TableRow>
            {:else}
              <TableRow>
                <TableCell colspan={4} class="text-muted">No records matched.</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    {/if}
  </div>
</DocsDemo>
