<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import CodeBlock from '$lib/ui/components/CodeBlock.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { DAMAGE_OPTIONS, STORED_ROW, checkedRow, damagedRow, isRowDamage } from './row-check';
  import type { RowDamage } from './row-check';

  let damage = $state<RowDamage>('none');

  const row = $derived(damagedRow(STORED_ROW, damage));
  const result = $derived(checkedRow(row));
  const json = $derived(JSON.stringify(row, null, 2));

  function choose(value: string): void {
    if (isRowDamage(value)) damage = value;
  }
</script>

<DocsDemo label="One stored book row, read back">
  <Field label="Change one field">
    {#snippet children(control)}
      <Select {...control} value={damage} onchange={(event) => choose(event.currentTarget.value)}>
        {#each DAMAGE_OPTIONS as option (option.damage)}
          <option value={option.damage}>{option.label}</option>
        {/each}
      </Select>
    {/snippet}
  </Field>
  <CodeBlock code={json} label="The row in the books store" />
  {#if result.kind === 'read'}
    <Alert variant="success" title="Read as a book">Every field passed its check.</Alert>
  {:else if result.kind === 'set-aside'}
    <Alert variant="warning" title="Set aside as unreadable">
      <code>{result.reason}</code>. The shelf lists it under "1 book could not be read", by its
      title or a short id, with Remove, and with Merge when a shelf book has the same content hash,
      file name or title.
    </Alert>
  {:else}
    <Alert variant="danger" title="The whole listing fails">
      <code>{result.reason}</code>. A row with no usable id cannot be named, removed or merged, so
      the read throws instead of setting it aside.
    </Alert>
  {/if}
  {#snippet caption()}
    The row goes through the library's real <code>booksFromStored</code>. Nothing is written to
    IndexedDB.
  {/snippet}
</DocsDemo>
