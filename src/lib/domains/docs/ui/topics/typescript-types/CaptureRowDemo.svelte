<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import Field from '$lib/components/Field.svelte';
  import Select from '$lib/components/Select.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { checkedCaptureRow, DAMAGE_OPTIONS, isRowDamage, rowText } from './capture-rows';
  import type { RowDamage } from './capture-rows';

  const ROW_LINES = 22;

  let damage = $state<RowDamage>('none');
  let text = $state(rowText('none'));

  const result = $derived(checkedCaptureRow(text));

  function choose(value: string): void {
    if (!isRowDamage(value)) return;
    damage = value;
    text = rowText(value);
  }
</script>

<DocsDemo label="Damage a stored capture">
  <div class="stack-md">
    <Field label="Start from">
      {#snippet children(control)}
        <Select {...control} value={damage} onchange={(event) => choose(event.currentTarget.value)}>
          {#each DAMAGE_OPTIONS as option (option.damage)}
            <option value={option.damage}>{option.label}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <Field label="The row, as JSON. Edit it freely.">
      {#snippet children(control)}
        <Textarea
          {...control}
          bind:value={text}
          rows={ROW_LINES}
          class="mono text-xs"
          spellcheck="false"
        />
      {/snippet}
    </Field>
    {#if result.kind === 'read'}
      <Alert variant="success" title="Read as a {result.capture.origin} capture">
        {#if result.defaults.length === 0}
          Every field passed its check.
        {:else}
          Filled or dropped: <code>{result.defaults.join(', ')}</code>
        {/if}
      </Alert>
      <CodeBlock
        code={JSON.stringify(result.capture, null, 2)}
        label="The Capture the mapper built"
      />
    {:else if result.kind === 'set-aside'}
      <Alert variant="warning" title="Set aside as unreadable">
        <code>{result.reason}</code>. Dokseo keeps only its id, <code>{result.id}</code>, says
        <q>1 capture could not be read</q> and offers <q>Remove 1 unreadable capture</q>.
      </Alert>
    {:else if result.kind === 'listing-fails'}
      <Alert variant="danger" title="The whole listing fails">
        <code>{result.reason}</code>. A row with no usable id cannot be listed or removed, so the
        read throws instead of setting it aside.
      </Alert>
    {:else}
      <Alert variant="danger" title="Not a row">
        <code>{result.reason}</code>
      </Alert>
    {/if}
  </div>
  {#snippet caption()}
    The text is parsed to <code>unknown</code>, checked to be an object with
    <code>isStoredFields</code>, and then read by the real <code>capturesFromStored</code> from the recognition
    domain. Nothing is written to IndexedDB.
  {/snippet}
</DocsDemo>
