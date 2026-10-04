<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import Field from '$lib/components/Field.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { SAMPLE_ROW_TEXT, saveSummary, savedRow } from './row-save';

  let text = $state(SAMPLE_ROW_TEXT);

  const save = $derived(savedRow(text));
  const summary = $derived(saveSummary(save));
  const written = $derived(save.kind === 'saved' ? JSON.stringify(save.written, null, 2) : null);
</script>

<DocsDemo label="A save that keeps a field it does not name" resettable>
  <Field label="The stored row, editable">
    {#snippet children(control)}
      <Textarea {...control} class="mono text-xs" rows={14} spellcheck="false" bind:value={text} />
    {/snippet}
  </Field>
  <Alert variant={summary.variant} title={summary.title}>{summary.text}</Alert>
  {#if save.kind === 'saved'}
    <div class="stack-sm">
      {#if save.kept.length > 0}
        <p class="m-0">
          Kept as stored, unchecked: <code>{save.kept.join(', ')}</code>
        </p>
      {/if}
      {#if save.rewritten.length > 0}
        <ul class="col gap-1">
          {#each save.rewritten as change (change.field)}
            <li>
              <code>{change.field}</code>: stored {change.stored}, written {change.written}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
  {#if written !== null}
    <CodeBlock code={written} label="The row update() would write" />
  {/if}
  {#snippet caption()}
    The save sets a new last read time, one of the two fields a page turn saves, through the
    library's real
    <code>bookFromStored</code>, <code>applyEdit</code> and <code>savedBookRow</code>. Try a
    <code>language</code> of <code>"xx"</code>, a <code>volume</code> of <code>"three"</code>, or a
    field of your own. Nothing is written to IndexedDB.
  {/snippet}
</DocsDemo>
