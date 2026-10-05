<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { probabilityOf, textAfter, tokensAfter } from '../../../domain/ocr-decoding';
  import type { DecodeRun } from '../../../domain/ocr-decoding';
  import DocsDemo from '../../DocsDemo.svelte';

  type Props = {
    run: DecodeRun;
  };

  let { run }: Props = $props();

  let shown = $state(0);

  const total = $derived(run.steps.length);
  const current = $derived(run.steps[shown]);
  const prefix = $derived(tokensAfter(run, shown));
  const pieces = $derived(
    new Map(run.steps.flatMap((step) => step.candidates.map((one) => [one.id, one.piece]))),
  );
  const finished = $derived(shown >= total);

  function dims(values: readonly number[]): string {
    return `[${values.join(', ')}]`;
  }
</script>

<DocsDemo label="Greedy decoding, step by step">
  {#snippet controls()}
    <Button size="sm" variant="ghost" disabled={shown === 0} onclick={() => (shown -= 1)}>
      Previous
    </Button>
    <Button size="sm" disabled={finished} onclick={() => (shown += 1)}>Next step</Button>
    <Button size="sm" variant="ghost" disabled={shown === 0} onclick={() => (shown = 0)}>
      Start again
    </Button>
  {/snippet}
  <dl class="grid-2 gap-2 m-0 text-sm">
    <dt class="text-muted">Pixel values</dt>
    <dd class="m-0">
      <code>{dims(run.pixelValueDims)}</code>, from {run.pixelValueRange.min} to {run
        .pixelValueRange.max}
    </dd>
    <dt class="text-muted">Encoder output</dt>
    <dd class="m-0"><code>{dims(run.encoderOutputDims)}</code>, once, in {run.encoderMs} ms</dd>
  </dl>
  <p class="m-0 text-sm">
    <span class="text-muted">Decoder input, {prefix.length} tokens:</span>
    {#each prefix as id, index (index)}
      <Badge class="ms-1 mono">{id} {pieces.get(id) ?? ''}</Badge>
    {/each}
  </p>
  {#if current !== undefined}
    <p class="m-0 text-sm">
      Step {shown + 1} of {total}. The decoder returns logits with dimensions
      <code>{dims([1, current.prefixLength, run.vocabularySize])}</code>, and only the last row of
      {run.vocabularySize} scores counts. The three highest:
    </p>
    <Table size="sm">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Token id</TableHeaderCell>
          <TableHeaderCell>Piece</TableHeaderCell>
          <TableHeaderCell>Log probability</TableHeaderCell>
          <TableHeaderCell>Probability</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each current.candidates as candidate, rank (candidate.id)}
          <TableRow>
            <TableCell class="mono">{candidate.id}</TableCell>
            <TableCell>
              {candidate.piece}
              {#if rank === 0}<Badge variant="success" class="ms-1">chosen</Badge>{/if}
            </TableCell>
            <TableCell class="mono">{candidate.logProb.toFixed(4)}</TableCell>
            <TableCell class="mono">{probabilityOf(candidate.logProb).toFixed(4)}</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  {:else}
    <p class="m-0 text-sm">
      The last step chose <code>[SEP]</code>, so the loop stopped after {total} decoder runs in {run.decoderMs}
      ms. The tokenizer decodes the ids to <code>{run.decoded}</code>, and the worker removes the
      spaces.
    </p>
  {/if}
  <p class="m-0 text-lg">
    <span class="text-sm text-muted">Text so far:</span>
    {textAfter(run, shown)}
  </p>
  {#snippet caption()}
    Recorded once from the real model reading the speech bubble on the sample page, in Chromium on
    the CPU, with the same files Dokseo downloads. Values are rounded to four decimals.
  {/snippet}
</DocsDemo>
