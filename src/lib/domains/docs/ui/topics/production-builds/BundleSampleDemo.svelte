<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Field from '$lib/components/Field.svelte';
  import Select from '$lib/components/Select.svelte';
  import { byteFigure } from '../../../domain/production-builds';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { BUNDLE_SAMPLES, shownCode } from './bundle-samples';

  let chosenId = $state<string | undefined>(undefined);

  const sample = $derived(
    BUNDLE_SAMPLES.find((candidate) => candidate.id === chosenId) ?? BUNDLE_SAMPLES[0],
  );

  function choose(event: Event & { currentTarget: HTMLSelectElement }): void {
    chosenId = event.currentTarget.value;
  }
</script>

<DocsDemo label="Real Rolldown output">
  {#if sample !== undefined}
    <Field label="Sample">
      {#snippet children(control)}
        <Select {...control} value={sample.id} onchange={choose}>
          {#each BUNDLE_SAMPLES as option (option.id)}
            <option value={option.id}>{option.title}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <p class="m-0 row wrap items-center gap-2 text-sm">
      <span>Source</span>
      <Badge>{sample.files.length} {sample.files.length === 1 ? 'module' : 'modules'}</Badge>
      {#if sample.sideEffectFree.length > 0}
        <Badge variant="info">declared free of side effects</Badge>
      {/if}
      {#if sample.minify}
        <Badge variant="info">minified</Badge>
      {/if}
    </p>
    {#each sample.files as file (file.name)}
      <p class="m-0 text-sm"><code>{file.name}</code></p>
      <DocsCode label={file.name} code={file.code.trimEnd()} />
    {/each}
    <p class="m-0 row wrap items-center gap-2 text-sm">
      <span>Output</span>
      <Badge>{sample.chunks.length} {sample.chunks.length === 1 ? 'file' : 'files'}</Badge>
    </p>
    {#each sample.chunks as chunk (chunk.fileName)}
      {@const label = `${chunk.fileName}, ${byteFigure(new TextEncoder().encode(chunk.code).length)}`}
      <p class="m-0 text-sm"><code>{label}</code></p>
      <DocsCode {label} code={shownCode(chunk)} />
    {/each}
    <p class="m-0 text-sm" aria-live="polite">{sample.point}</p>
  {/if}
  {#snippet caption()}
    Each output was produced by the Vite 8.3.0 and Rolldown 1.2.9 installed with Dokseo, through
    Vite's own <code>build()</code> in production mode, and is recorded here. A unit test builds every
    sample again and fails if the output changes.
  {/snippet}
</DocsDemo>
