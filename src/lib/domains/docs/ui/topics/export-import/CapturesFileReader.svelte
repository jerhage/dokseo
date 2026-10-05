<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Checkbox from '$lib/ui/components/Checkbox.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Fieldset from '$lib/ui/components/Fieldset.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import Textarea from '$lib/ui/components/Textarea.svelte';
  import { APP_VERSION } from '$lib/shared/app-version';
  import { buildCapturesFile } from '$lib/domains/storage/use-cases/build-captures-file';
  import { readCapturesFile } from '$lib/domains/storage/use-cases/read-captures-file';
  import { unreadableLines } from '$lib/domains/storage/ui/captures-import-text';
  import { ENTRY_BREAKS, FILE_BREAKS, brokenText, isFileBreak } from './file-breakage';
  import type { EntryBreak, FileBreak } from './file-breakage';
  import { SAMPLE_HOLDINGS, SAMPLE_START, fileContents } from './sample-holdings';

  const FILE = buildCapturesFile(fileContents(SAMPLE_HOLDINGS, SAMPLE_START, APP_VERSION)).file;

  let whole = $state<FileBreak>('none');
  let entries = $state.raw<ReadonlySet<EntryBreak>>(new Set());
  let text = $state(brokenText(FILE, 'none', new Set()));

  const read = $derived(readCapturesFile(text));

  function rewrite(): void {
    text = brokenText(FILE, whole, entries);
  }

  function chooseWhole(value: string): void {
    if (!isFileBreak(value)) return;
    whole = value;
    rewrite();
  }

  function toggle(value: EntryBreak, on: boolean): void {
    const next = new Set(entries);
    if (on) next.add(value);
    else next.delete(value);
    entries = next;
    rewrite();
  }
</script>

<div class="stack-md">
  <Field label="The whole file">
    {#snippet children(control)}
      <Select
        {...control}
        value={whole}
        onchange={(event) => chooseWhole(event.currentTarget.value)}
      >
        {#each FILE_BREAKS as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </Select>
    {/snippet}
  </Field>
  <Fieldset legend="Single entries">
    <div class="col gap-2">
      {#each ENTRY_BREAKS as option (option.value)}
        <Checkbox
          checked={entries.has(option.value)}
          onchange={(event) => toggle(option.value, event.currentTarget.checked)}
        >
          {option.label}
        </Checkbox>
      {/each}
    </div>
  </Fieldset>
  <Field label="The file's text, editable">
    {#snippet children(control)}
      <Textarea {...control} class="mono text-xs" rows={12} spellcheck="false" bind:value={text} />
    {/snippet}
  </Field>

  {#if read.kind === 'not-an-export'}
    <Alert variant="danger" title="not-an-export">
      The whole file is rejected. The import screen shows: This file is not a captures export.
    </Alert>
  {:else if read.kind === 'newer-version'}
    <Alert variant="warning" title="newer-version, version {read.version}">
      The whole file is rejected, with a different message: This file comes from a newer version of
      the app. Update the app, then import it again.
    </Alert>
  {:else}
    {@const lines = unreadableLines(read.unreadable, read.droppedTags.length)}
    <Alert
      variant={lines.length === 0 ? 'success' : 'warning'}
      title="read: {read.books.length} books, {read.tags.length} tags, {read.captures
        .length} captures"
    >
      {#if lines.length === 0}
        Every entry passed its checks.
      {:else}
        <ul class="col gap-1">
          {#each lines as line, index (index)}
            <li>{line}</li>
          {/each}
        </ul>
      {/if}
    </Alert>
  {/if}
</div>
