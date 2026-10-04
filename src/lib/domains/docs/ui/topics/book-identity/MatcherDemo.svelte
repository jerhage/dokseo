<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import Input from '$lib/components/Input.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import Select from '$lib/components/Select.svelte';
  import type { BookMatching } from '$lib/domains/library/domain/book/book-matching';
  import DocsDemo from '../../DocsDemo.svelte';
  import type { HoldingKind } from './identity-demos';
  import {
    MatcherPlayground,
    UPLOAD_PRESETS,
    outcomeMarks,
    verdictOf,
  } from './matcher-playground.svelte';

  const KINDS: readonly { readonly value: HoldingKind; readonly label: string }[] = [
    { value: 'shelf', label: 'On the shelf' },
    { value: 'removed', label: 'Removed record' },
    { value: 'unreadable', label: 'Unreadable row' },
  ];

  const MATCHINGS: readonly { readonly value: BookMatching; readonly label: string }[] = [
    { value: 'content', label: 'Content' },
    { value: 'file-name', label: 'File name' },
  ];

  const playground = new MatcherPlayground();

  function kindOf(value: string): HoldingKind | null {
    return KINDS.find((option) => option.value === value)?.value ?? null;
  }

  const verdict = $derived(verdictOf(playground.outcome));

  const marked = $derived(outcomeMarks(playground.outcome));
</script>

<DocsDemo label="Match an upload">
  {#snippet caption()}
    The answer comes from the real <code>joinUpload</code>, <code>restorableMatch</code> and
    <code>mergeableRows</code>, run on the rows above. They live only in this demo; the library is
    not read or written. A lower row counts as added more recently.
  {/snippet}
  <div class="stack-lg">
    <div class="stack-md">
      <h3 class="m-0 text-base">What this browser holds</h3>
      {#each playground.holdings as holding (holding.id)}
        {@const mark = marked.get(holding.id)}
        <div class="stack-sm bordered rounded-container p-3 min-w-0">
          <div class="row wrap items-center justify-between gap-2">
            <span class="row items-center gap-2">
              <code>{holding.id}</code>
              {#if mark !== undefined}
                <Badge variant="primary">{mark}</Badge>
              {/if}
            </span>
            <Button
              size="sm"
              variant="ghost-danger"
              onclick={() => playground.removeHolding(holding.id)}>Delete row</Button
            >
          </div>
          <div class="grid-2 gap-2">
            <Field label="Kind">
              {#snippet children(control)}
                <Select
                  {...control}
                  value={holding.kind}
                  onchange={(event) => {
                    const kind = kindOf(event.currentTarget.value);
                    if (kind !== null) holding.kind = kind;
                  }}
                >
                  {#each KINDS as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </Select>
              {/snippet}
            </Field>
            <Field label="Title">
              {#snippet children(control)}
                <Input {...control} bind:value={holding.title} />
              {/snippet}
            </Field>
            <Field label="File name">
              {#snippet children(control)}
                <Input {...control} bind:value={holding.fileName} />
              {/snippet}
            </Field>
            <Field label="Content hash">
              {#snippet children(control)}
                <Input {...control} class="mono" bind:value={holding.contentHash} />
              {/snippet}
            </Field>
          </div>
        </div>
      {/each}
      <div class="row wrap gap-2">
        {#each KINDS as option (option.value)}
          <Button size="sm" variant="outline" onclick={() => playground.addHolding(option.value)}
            >Add: {option.label.toLowerCase()}</Button
          >
        {/each}
      </div>
    </div>
    <div class="stack-md">
      <h3 class="m-0 text-base">The upload</h3>
      <div class="row wrap gap-2">
        {#each UPLOAD_PRESETS as preset (preset.label)}
          <Button size="sm" variant="outline" onclick={() => playground.usePreset(preset)}
            >{preset.label}</Button
          >
        {/each}
      </div>
      <div class="grid-2 gap-2">
        <Field label="Content hash">
          {#snippet children(control)}
            <Input {...control} class="mono" bind:value={playground.upload.contentHash} />
          {/snippet}
        </Field>
        <Field label="File name">
          {#snippet children(control)}
            <Input {...control} bind:value={playground.upload.fileName} />
          {/snippet}
        </Field>
        <Field label="Title" hint="metadata title, else the file title">
          {#snippet children(control)}
            <Input {...control} bind:value={playground.upload.title} />
          {/snippet}
        </Field>
        <Field label="File title" hint="the file name without its extension">
          {#snippet children(control)}
            <Input {...control} bind:value={playground.upload.fileTitle} />
          {/snippet}
        </Field>
      </div>
      <SegmentedControl
        label="Match books by"
        variant="track"
        options={MATCHINGS}
        bind:value={playground.matching}
      />
    </div>
    <Alert variant={verdict.variant} title={verdict.title}>
      <p class="m-0">{verdict.body}</p>
    </Alert>
  </div>
</DocsDemo>
