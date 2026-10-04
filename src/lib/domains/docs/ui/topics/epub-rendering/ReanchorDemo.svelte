<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import { DEFAULT_READING_SETTINGS } from '$lib/domains/flowing/domain/reading-settings';
  import type { SampleEdition } from '../../../domain/sample-epub';
  import DocsDemo from '../../DocsDemo.svelte';
  import type { FlowKit } from './flow-kit';
  import { arrivalSummary, arrivalTone, Reanchor } from './reanchor.svelte';
  import SampleBookStage from './SampleBookStage.svelte';

  type Props = {
    kit: FlowKit;
  };

  let { kit }: Props = $props();

  const EDITIONS: readonly { value: SampleEdition; label: string }[] = [
    { value: 'foreword', label: 'Add a foreword chapter' },
    { value: 'inserted-paragraph', label: 'Add a paragraph above it' },
    { value: 'edited-sentence', label: 'Edit the sentence before it' },
    { value: 'restructured', label: 'Wrap the chapter in a section' },
  ];

  const reanchor = new Reanchor(
    (host, opening, bind) => kit.open(host, opening, bind),
    (doc, index, cfis, titles) => kit.passage(doc, index, cfis, titles),
  );

  const step = $derived(reanchor.state);
  const held = $derived(step.kind === 'reading' ? null : step.passage);
  const reissued = $derived(step.kind === 'reissued' || step.kind === 'arrived');
</script>

<DocsDemo label="Capture a passage, change the book, find it again">
  {#snippet caption()}
    The capture runs <code>selectedPassage</code> and the return trip runs
    <code>goToPassage</code>, both from the flowing domain. The ring is the one the reader draws on
    a passage it arrived at. Nothing is stored.
  {/snippet}
  <div class="stack-md">
    <SampleBookStage
      stage={reanchor.stage}
      book={reanchor.firstEdition}
      settings={DEFAULT_READING_SETTINGS}
      ink={kit.ink}
      label="The sample book, for re-anchoring"
    />
    <div class="row wrap items-center gap-2">
      {#if !reissued}
        <Button size="sm" onclick={() => void reanchor.captureSample()}
          >Capture the sample sentence</Button
        >
        <Button size="sm" variant="ghost" onclick={() => reanchor.captureSelection()}
          >Capture my selection</Button
        >
      {:else}
        <Button size="sm" variant="primary" onclick={() => void reanchor.goBack()}
          >Go to the passage</Button
        >
        <Button size="sm" variant="ghost" onclick={() => void reanchor.restart()}
          >Start again</Button
        >
      {/if}
    </div>
    {#if reanchor.notice !== null}
      <Alert>{reanchor.notice}</Alert>
    {/if}
    {#if held !== null}
      <dl class="stack-sm text-sm">
        <div>
          <dt class="text-muted">CFI</dt>
          <dd class="m-0 wrap-anywhere"><code>{held.cfi}</code></dd>
        </div>
        <div>
          <dt class="text-muted">Quote: prefix, exact, suffix</dt>
          <dd class="m-0 wrap-anywhere" lang="ja">
            <span class="text-muted">{held.quote.prefix}</span>
            <mark>{held.quote.exact}</mark>
            <span class="text-muted">{held.quote.suffix}</span>
          </dd>
        </div>
      </dl>
      {#if step.kind === 'captured'}
        <p class="text-sm m-0">Now publish a new edition of the book:</p>
        <div class="row wrap gap-2">
          {#each EDITIONS as edition (edition.value)}
            <Button size="sm" onclick={() => void reanchor.reissue(edition.value)}
              >{edition.label}</Button
            >
          {/each}
        </div>
      {/if}
    {/if}
    {#if step.kind === 'arrived'}
      <p class="row wrap items-center gap-2 text-sm m-0" aria-live="polite">
        <Badge variant={arrivalTone(step.arrival)}>{step.arrival.kind}</Badge>
        {arrivalSummary(step.arrival)}
      </p>
    {/if}
  </div>
</DocsDemo>
