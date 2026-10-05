<script lang="ts">
  import { onDestroy } from 'svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { startBlobWorker } from './demo-workers';
  import { POST_SAMPLES } from './post-samples';
  import { PostTester } from './post-tester.svelte';

  const tester = new PostTester(startBlobWorker);

  onDestroy(() => tester.dispose());
</script>

<DocsDemo label="What can I post?">
  {#snippet caption()}
    Each value goes to one worker inside <code>{'{'} id, value {'}'}</code>. The worker describes
    what it received and posts the description back. An error is what this page's
    <code>postMessage</code> threw.
  {/snippet}
  {#snippet controls()}
    <Button size="sm" onclick={() => void tester.postAll(POST_SAMPLES)}>Post them all</Button>
  {/snippet}
  <Table size="sm" caption="Values posted from this page">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Value and result</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each POST_SAMPLES as sample (sample.name)}
        {@const outcome = tester.outcomes.get(sample.name)}
        <TableRow>
          <TableCell>
            <div class="stack-sm">
              <span>{sample.name}</span>
              <code>{sample.code}</code>
              {#if outcome === undefined}
                <span>
                  <Button size="sm" variant="outline" onclick={() => void tester.post(sample)}
                    >Post</Button
                  >
                </span>
              {:else if outcome.kind === 'posting'}
                <span class="text-muted">Posting…</span>
              {:else if outcome.kind === 'arrived'}
                <div class="stack-sm">
                  <span><Badge variant="success">cloned</Badge></span>
                  <code>{outcome.description}</code>
                </div>
              {:else if outcome.kind === 'threw'}
                <div class="stack-sm">
                  <span><Badge variant="danger">{outcome.name}</Badge></span>
                  <span class="text-sm">{outcome.message}</span>
                </div>
              {:else}
                <span class="text-muted">{outcome.cause}</span>
              {/if}
            </div>
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</DocsDemo>
