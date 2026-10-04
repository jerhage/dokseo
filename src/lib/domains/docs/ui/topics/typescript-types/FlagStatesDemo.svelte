<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import Stat from '$lib/components/Stat.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import {
    fieldsWith,
    flagCellText,
    flagRows,
    flagTally,
    flatLoadType,
    LOAD_DETAILS,
  } from '../../../domain/flag-states';
  import type { LoadDetail } from '../../../domain/flag-states';
  import DocsDemo from '../../DocsDemo.svelte';

  const UNION = `type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready'; readonly titles: readonly string[] };`;

  let titles = $state(false);
  let message = $state(false);

  const details: readonly LoadDetail[] = $derived(
    LOAD_DETAILS.filter((detail) => (detail === 'titles' ? titles : message)),
  );
  const fields = $derived(fieldsWith(details));
  const rows = $derived(flagRows(details));
  const tally = $derived(flagTally(rows));
  const flatType = $derived(flatLoadType(details));
</script>

<DocsDemo label="Booleans or a union">
  <div class="stack-md">
    <div class="row wrap gap-3">
      <Checkbox bind:checked={titles}>Add <code>titles?</code></Checkbox>
      <Checkbox bind:checked={message}>Add <code>message?</code></Checkbox>
    </div>
    <div class="grid-2 gap-3">
      <div class="stack-sm min-w-0">
        <CodeBlock code={flatType} label="Flags and optional fields" />
        <Stat
          label="Combinations the type accepts"
          value={String(tally.combinations)}
          delta="{tally.meaningful} mean something"
        />
      </div>
      <div class="stack-sm min-w-0">
        <CodeBlock code={UNION} label="A union of the real states" />
        <Stat label="States the union accepts" value="3" delta="each one means something" />
      </div>
    </div>
    <Table size="sm">
      <TableHeader>
        <TableRow>
          {#each fields as field (field)}
            <TableHeaderCell class="mono">{field}</TableHeaderCell>
          {/each}
          <TableHeaderCell>In the union</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each rows as row, index (index)}
          <TableRow>
            {#each row.cells as cell (cell.field)}
              <TableCell class="mono text-xs">{flagCellText(cell)}</TableCell>
            {/each}
            <TableCell>
              {#if row.verdict.kind === 'variant'}
                <Badge variant="success">kind: '{row.verdict.variant}'</Badge>
              {:else}
                <span class="text-xs text-muted">{row.verdict.reasons.join('; ')}</span>
              {/if}
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
  {#snippet caption()}
    Every combination of the flat type's fields, from all false to all true. A row with a badge is
    one of the three states the union names; every other row compiles against the flat type and has
    no variant in the union.
  {/snippet}
</DocsDemo>
