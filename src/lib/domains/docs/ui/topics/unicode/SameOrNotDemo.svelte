<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import type { Comparison } from '../../../domain/unicode-text';
  import DocsDemo from '../../DocsDemo.svelte';
  import { sameOrNot } from './dokseo-text';

  type Pair = { readonly label: string; readonly left: string; readonly right: string };

  const PAIRS: readonly Pair[] = [
    { label: 'Composed and decomposed', left: 'が', right: 'が' },
    { label: 'Half-width and full-width', left: 'ｶﾞｲﾄﾞ', right: 'ガイド' },
    { label: 'Full-width Latin', left: 'ＡＢＣ', right: 'abc' },
    { label: 'Katakana and hiragana', left: 'ネコ', right: 'ねこ' },
    { label: 'Voiced and plain', left: 'が', right: 'か' },
    { label: 'A circled number', left: '①', right: '1' },
    { label: 'A square word', left: '㌔', right: 'キロ' },
    { label: 'Extra spaces', left: '  my   words ', right: 'My words' },
  ];

  let left = $state('ｶﾞｲﾄﾞ');
  let right = $state('ガイド');

  const result = $derived(sameOrNot(left, right));
  const rows: readonly Comparison[] = $derived([
    ...result.plain,
    ...result.collator,
    result.dokseo,
  ]);

  function choose(pair: Pair): void {
    left = pair.left;
    right = pair.right;
  }
</script>

<DocsDemo label="Same or not?">
  {#snippet caption()}
    Each row runs in this browser. The collator rows use the <code>ja</code> locale, and the last
    row is Dokseo's real <code>sameTagName</code>.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap gap-2">
      {#each PAIRS as pair (pair.label)}
        <Button size="sm" variant="outline" onclick={() => choose(pair)}>{pair.label}</Button>
      {/each}
    </div>
    <div class="grid-2 gap-2">
      <Field label="Left">
        {#snippet children(control)}
          <Input {...control} bind:value={left} lang="ja" />
        {/snippet}
      </Field>
      <Field label="Right">
        {#snippet children(control)}
          <Input {...control} bind:value={right} lang="ja" />
        {/snippet}
      </Field>
    </div>
    <Table size="sm">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Comparison</TableHeaderCell>
          <TableHeaderCell>Result</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each rows as row (row.label)}
          <TableRow>
            <TableCell class="mono text-xs">{row.label}</TableCell>
            <TableCell>
              {#if row.equal}
                <Badge variant="success">same</Badge>
              {:else}
                <Badge>different</Badge>
              {/if}
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</DocsDemo>
