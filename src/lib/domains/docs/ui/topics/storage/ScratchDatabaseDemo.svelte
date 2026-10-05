<script lang="ts">
  import { onMount } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { SCRATCH_DATABASE, createScratchDatabaseStore } from './scratch-database';
  import { ScratchDatabase } from './scratch-database.svelte';

  const scratch = new ScratchDatabase({ store: createScratchDatabaseStore(), now: Date.now });

  const state = $derived(scratch.state);
  const present = $derived(state.kind === 'present');

  onMount(() => {
    void scratch.refresh();
  });
</script>

<DocsDemo label="A scratch IndexedDB database">
  <p class="m-0 text-sm">
    The buttons work on a database named <code>{SCRATCH_DATABASE}</code>, which only this demo uses.
    Dokseo's own databases are listed, never opened.
  </p>
  <div class="row wrap items-center gap-2">
    <Button
      size="sm"
      variant="primary"
      disabled={scratch.busy}
      onclick={() => void scratch.create()}
    >
      Open (and create)
    </Button>
    <Button size="sm" disabled={scratch.busy || !present} onclick={() => void scratch.add()}>
      Add a row
    </Button>
    <Button
      size="sm"
      variant="ghost-danger"
      disabled={scratch.busy || !present}
      onclick={() => void scratch.remove()}>Delete the demo database</Button
    >
  </div>

  {#if state.kind === 'failed'}
    <Alert variant="danger" title="The demo database failed">{state.message}</Alert>
  {:else if state.kind === 'present'}
    {#if state.notes.length === 0}
      <p class="m-0 text-sm text-muted">The <code>notes</code> store exists and holds no rows.</p>
    {:else}
      <Table size="sm">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>id (key)</TableHeaderCell>
            <TableHeaderCell>text</TableHeaderCell>
            <TableHeaderCell>savedAt</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each state.notes as note (note.id)}
            <TableRow>
              <TableCell>{note.id}</TableCell>
              <TableCell>{note.text}</TableCell>
              <TableCell>{new Date(note.savedAt).toLocaleTimeString()}</TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    {/if}
  {:else if state.kind === 'absent'}
    <p class="m-0 text-sm text-muted">The demo database does not exist on this device.</p>
  {/if}

  {#if scratch.log.length > 0}
    <ul class="m-0 text-sm">
      {#each scratch.log as entry, index (index)}
        <li>{entry}</li>
      {/each}
    </ul>
  {/if}

  {#if scratch.appDatabases !== null}
    <p class="row wrap items-center gap-2 m-0 text-sm">
      <span>Other databases of this origin, from <code>indexedDB.databases()</code>:</span>
      {#each scratch.appDatabases as listing (listing.name)}
        <Badge>{listing.name} v{listing.version}</Badge>
      {:else}
        <span class="text-muted">none yet</span>
      {/each}
    </p>
  {/if}
</DocsDemo>
