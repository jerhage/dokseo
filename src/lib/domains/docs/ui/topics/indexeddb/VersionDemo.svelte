<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { match } from 'ts-pattern';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { BROWSER_VERSION_DRIVER, VERSIONS_NAME } from './version-driver';
  import { VersionLab } from './version-lab.svelte';
  import type { Speaker } from './version-lab.svelte';

  const lab = new VersionLab(BROWSER_VERSION_DRIVER);

  const SPEAKER_BADGES: Readonly<Record<Speaker, 'primary' | 'accent' | 'neutral'>> = {
    A: 'primary',
    B: 'accent',
    page: 'neutral',
  };

  const a = $derived(lab.a);
  const aText = $derived(
    match(a)
      .with({ kind: 'open' }, (open) => `open at version ${open.connection.version}`)
      .with({ kind: 'closed' }, (closed) => `closed (it was at version ${closed.version})`)
      .with({ kind: 'none' }, () => 'not opened yet')
      .exhaustive(),
  );

  onMount(() => {
    void lab.refresh();
  });

  onDestroy(() => lab.closeA());
</script>

<DocsDemo label="Two connections and a version change">
  {#snippet caption()}
    Connection A and connection B both live on this page and stand for two tabs. They open
    <code>{VERSIONS_NAME}</code>, a database only this demo uses. Each upgrade creates every store
    the new version defines that is still missing.
  {/snippet}
  <div class="stack-md">
    <p class="m-0 text-sm">
      Stored version: <strong>{lab.stored ?? 'unknown in this browser'}</strong>. Connection A: {aText}.
    </p>
    <Checkbox bind:checked={lab.closesOnChange}>A closes when it gets versionchange</Checkbox>
    <div class="row wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={a.kind === 'open'}
        onclick={() => void lab.openA()}
      >
        {a.kind === 'closed' ? `Reopen A at version ${a.version}` : 'Open A'}
      </Button>
      <Button
        size="sm"
        variant="primary"
        loading={lab.waiting}
        disabled={lab.waiting}
        onclick={() => void lab.openB()}>Open B at version {lab.nextVersion}</Button
      >
      <Button size="sm" variant="outline" disabled={a.kind !== 'open'} onclick={() => lab.closeA()}
        >Close A</Button
      >
      <Button
        size="sm"
        variant="ghost-danger"
        disabled={lab.waiting}
        onclick={() => void lab.remove()}>Delete this database</Button
      >
    </div>
    <Table size="sm" caption="Events in the order they fired">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Who</TableHeaderCell>
          <TableHeaderCell>What happened</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each lab.log as entry (entry.id)}
          <TableRow>
            <TableCell
              ><Badge variant={SPEAKER_BADGES[entry.speaker]}>{entry.speaker}</Badge></TableCell
            >
            <TableCell>{entry.text}</TableCell>
          </TableRow>
        {:else}
          <TableRow>
            <TableCell colspan={2} class="text-muted">Open A, then open B.</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</DocsDemo>
