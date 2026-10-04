<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { PRESET_OPTIONS, presetText, readSummary, strictRead } from './strict-read';

  let text = $state(presetText('full'));

  const read = $derived(strictRead(text));
  const summary = $derived(readSummary(read));
</script>

<DocsDemo label="The strict read of one book row" resettable>
  <div class="row wrap gap-2">
    {#each PRESET_OPTIONS as option (option.preset)}
      <Button size="sm" variant="outline" onclick={() => (text = presetText(option.preset))}>
        {option.label}
      </Button>
    {/each}
  </div>
  <Field label="The stored row, editable">
    {#snippet children(control)}
      <Textarea {...control} class="mono text-xs" rows={16} spellcheck="false" bind:value={text} />
    {/snippet}
  </Field>
  <Alert variant={summary.variant} title={summary.title}>{summary.text}</Alert>
  {#snippet caption()}
    The row goes through the library's real <code>bookFromStored</code>. The editor also accepts a
    bare <code>NaN</code> or <code>Infinity</code>, which JSON cannot hold but a stored row can.
    Nothing is written to IndexedDB.
  {/snippet}
</DocsDemo>
