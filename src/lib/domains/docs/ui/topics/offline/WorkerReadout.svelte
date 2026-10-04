<script lang="ts">
  import { version } from '$app/environment';
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { shellCacheName } from '$lib/platform/service-worker/shell-cache';
  import type { CacheRole } from '../../../domain/offline';
  import DocsDemo from '../../DocsDemo.svelte';
  import { readCaches, readWorker } from './worker-readout';
  import type { WorkerSlot } from './worker-readout';

  const ROLES: Readonly<Record<CacheRole, string>> = {
    'this-build-shell': 'shell, this build',
    'older-shell': 'shell, an older build',
    model: 'transformers.js models',
    other: 'other',
  };

  function slotText(worker: WorkerSlot): string {
    return worker === null ? 'none' : worker.state;
  }
</script>

<DocsDemo label="This page, read only" resettable resetLabel="Read again">
  {#snippet caption()}
    Read from <code>navigator.serviceWorker</code> and <code>caches</code> on this page. Nothing is registered,
    opened beyond the listed caches, or deleted.
  {/snippet}
  <div class="stack-md">
    {#await readWorker()}
      <p class="m-0 text-sm text-muted">Reading the registration…</p>
    {:then worker}
      {#if worker.kind === 'unsupported'}
        <Alert variant="warning" title="No service worker support">
          This browser, or this context, has no <code>navigator.serviceWorker</code>.
        </Alert>
      {:else if worker.kind === 'unregistered'}
        <Alert title="No service worker is registered for this page">
          Dokseo registers its service worker only in a production build: the root layout calls
          <code>watchShellUpdates</code> only when <code>dev</code> is false. These pages exist only on
          the development server, so here the readout is empty, and every request goes straight to the
          network.
        </Alert>
      {:else}
        <Table size="sm" caption="The registration">
          <TableBody>
            <TableRow>
              <TableHeaderCell scope="row">Scope</TableHeaderCell>
              <TableCell><code>{worker.scope}</code></TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">Controls this page</TableHeaderCell>
              <TableCell>{worker.controlled}</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">Active</TableHeaderCell>
              <TableCell>{slotText(worker.active)}</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">Waiting</TableHeaderCell>
              <TableCell>{slotText(worker.waiting)}</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">Installing</TableHeaderCell>
              <TableCell>{slotText(worker.installing)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      {/if}
    {:catch error}
      <p class="m-0 text-danger">Reading the registration failed: {String(error)}</p>
    {/await}

    <p class="m-0 text-sm">
      A build of this version would name its shell cache <code>{shellCacheName(version)}</code>.
    </p>

    {#await readCaches(version)}
      <p class="m-0 text-sm text-muted">Listing the caches…</p>
    {:then reading}
      {#if reading.kind === 'unsupported'}
        <p class="m-0 text-sm text-muted">The Cache API is not available in this context.</p>
      {:else}
        <Table size="sm" caption="Cache Storage for this origin">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Cache</TableHeaderCell>
              <TableHeaderCell>Entries</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each reading.caches as cache (cache.name)}
              <TableRow>
                <TableCell><code>{cache.name}</code></TableCell>
                <TableCell>{cache.entries}</TableCell>
                <TableCell><Badge>{ROLES[cache.role]}</Badge></TableCell>
              </TableRow>
            {:else}
              <TableRow>
                <TableCell colspan={3} class="text-muted">This origin holds no caches.</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    {:catch error}
      <p class="m-0 text-danger">Listing the caches failed: {String(error)}</p>
    {/await}
  </div>
</DocsDemo>
