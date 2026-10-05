<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { policyDirectives } from '../../../domain/security-headers';
  import type { PolicyDirective } from '../../../domain/security-headers';

  type Reading =
    | { readonly kind: 'idle' }
    | { readonly kind: 'reading' }
    | {
        readonly kind: 'read';
        readonly opener: string | null;
        readonly embedder: string | null;
        readonly policy: readonly PolicyDirective[];
      }
    | { readonly kind: 'failed'; readonly reason: string };

  let reading = $state<Reading>({ kind: 'idle' });

  async function read(): Promise<void> {
    reading = { kind: 'reading' };
    try {
      const response = await fetch(location.href, { cache: 'no-store' });
      const policy = policyDirectives(response.headers.get('content-security-policy') ?? '');
      reading = {
        kind: 'read',
        opener: response.headers.get('cross-origin-opener-policy'),
        embedder: response.headers.get('cross-origin-embedder-policy'),
        policy,
      };
    } catch (error) {
      reading = { kind: 'failed', reason: error instanceof Error ? error.message : String(error) };
    }
  }
</script>

<div class="stack-md">
  <div class="row wrap gap-2">
    <Button size="sm" loading={reading.kind === 'reading'} onclick={() => void read()}>
      Fetch this page again
    </Button>
  </div>
  {#if reading.kind === 'read'}
    <Table size="sm" caption="Isolation headers">
      <TableBody>
        <TableRow>
          <TableHeaderCell scope="row"><code>Cross-Origin-Opener-Policy</code></TableHeaderCell>
          <TableCell><code>{reading.opener ?? 'absent'}</code></TableCell>
        </TableRow>
        <TableRow>
          <TableHeaderCell scope="row"><code>Cross-Origin-Embedder-Policy</code></TableHeaderCell>
          <TableCell><code>{reading.embedder ?? 'absent'}</code></TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <Table size="sm" caption="Content-Security-Policy, one row per directive">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Directive</TableHeaderCell>
          <TableHeaderCell>Sources</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each reading.policy as directive (directive.name)}
          <TableRow>
            <TableCell><code>{directive.name}</code></TableCell>
            <TableCell><code>{directive.sources.join(' ')}</code></TableCell>
          </TableRow>
        {:else}
          <TableRow>
            <TableCell colspan={2} class="text-muted"
              >The response carried no policy header.</TableCell
            >
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  {:else if reading.kind === 'failed'}
    <p class="text-danger m-0">The request failed: {reading.reason}</p>
  {/if}
</div>
