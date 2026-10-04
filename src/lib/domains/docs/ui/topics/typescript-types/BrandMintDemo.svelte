<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { mintedIds, mintedRects, RAW_ID_PRESETS } from './brand-mint';

  let raw = $state(RAW_ID_PRESETS[0] ?? '');

  const minted = $derived(mintedIds(raw));
  const rects = $derived(mintedRects(120, 64, 88, 240));
</script>

<DocsDemo label="Mint a brand">
  <div class="stack-md">
    <div class="row wrap gap-2">
      {#each RAW_ID_PRESETS as preset (preset)}
        <Button size="sm" variant="outline" onclick={() => (raw = preset)}>
          {preset === '' ? 'empty' : preset.slice(0, 12)}
        </Button>
      {/each}
    </div>
    <Field label="raw">
      {#snippet children(control)}
        <Input {...control} bind:value={raw} class="mono" />
      {/snippet}
    </Field>
    <Table size="sm">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Expression</TableHeaderCell>
          <TableHeaderCell>Value at run time</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each minted as row (row.expression)}
          <TableRow>
            <TableCell class="mono text-xs">{row.expression}</TableCell>
            <TableCell class="mono text-xs">{row.value}</TableCell>
          </TableRow>
        {/each}
        <TableRow>
          <TableCell class="mono text-xs">screenRect(120, 64, 88, 240)</TableCell>
          <TableCell class="mono text-xs">{rects.screen}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell class="mono text-xs">imageRect(120, 64, 88, 240)</TableCell>
          <TableCell class="mono text-xs">{rects.image}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell class="mono text-xs">same JSON for both rects</TableCell>
          <TableCell class="mono text-xs">{String(rects.same)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <p class="m-0">
      Nothing in these values says which brand they have. The difference exists only while the code
      is being compiled.
    </p>
  </div>
  {#snippet caption()}
    Each row runs Dokseo's real <code>bookId</code>, <code>tagId</code>,
    <code>parsedBookId</code>, <code>screenRect</code> and <code>imageRect</code> from
    <code>shared/</code>.
  {/snippet}
</DocsDemo>
