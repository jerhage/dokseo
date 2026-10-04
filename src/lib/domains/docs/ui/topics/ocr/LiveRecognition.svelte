<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import { useContainer } from '$lib/context';
  import { deviceName } from '$lib/domains/recognition/domain/engine/recognizer-session';
  import { isStored } from '$lib/domains/recognition/domain/model/model-cache';
  import {
    chosenModel,
    downloadMb,
    runtimeMb,
    weightsMb,
  } from '$lib/domains/recognition/domain/model/model-footprint';
  import type { ModelFootprint } from '$lib/domains/recognition/domain/model/model-footprint';
  import { loadVerb } from '$lib/domains/recognition/domain/model/model-load';
  import type { ImageRegion } from '$lib/shared/image-region';
  import type { PageSource } from '$lib/shared/page-source';
  import DocsDemo from '../../DocsDemo.svelte';
  import { LiveRecognition } from './live-recognition.svelte';
  import type { ModelPresence } from './live-recognition.svelte';

  type Props = {
    source: PageSource;
    regions: readonly ImageRegion[];
    onread: (text: string, confidence: number | null) => void;
  };

  let { source, regions, onread }: Props = $props();

  const recognition = useContainer().recognition;

  async function chosenJapaneseModel(): Promise<ModelFootprint | null> {
    const read = await recognition.readRecognizerSetup('ja');
    return read.kind === 'success' ? read.choice.model : chosenModel('ja', null);
  }

  async function presence(modelId: string): Promise<ModelPresence> {
    const read = await recognition.readModelStorage(modelId);
    if (read.kind !== 'success') return 'cache-unavailable';
    return isStored(read.snapshot.report) ? 'stored' : 'not-stored';
  }

  const live = new LiveRecognition({
    chosenModel: chosenJapaneseModel,
    presence,
    recognize: (notices) => recognition.recognizeRegion('ja', source, regions, 'row', notices),
    close: () => recognition.closeRecognizer('ja'),
    now: () => performance.now(),
    onread: (text, confidence) => onread(text, confidence),
  });

  const view = $derived(live.state);

  onMount(() => {
    void live.check();
  });

  onDestroy(() => {
    void live.dispose();
  });
</script>

{#snippet readButton(model: ModelFootprint, present: ModelPresence)}
  <Button variant="primary" onclick={() => void live.read()}>
    {present === 'stored' ? 'Read the selection' : `Download ${downloadMb(model)} MB and read`}
  </Button>
{/snippet}

<DocsDemo label="The real model">
  {#if view.kind === 'checking'}
    <p class="m-0 text-sm text-muted">Looking for the model in this site's Cache API…</p>
  {:else if view.kind === 'no-model'}
    <p class="m-0 text-sm">No recognition model is known for Japanese.</p>
  {:else if view.kind === 'ready'}
    <p class="m-0 text-sm">
      Your engine settings choose <strong>{view.model.label}</strong>
      (<code>{view.model.modelId}</code>).
    </p>
    {#if view.presence === 'stored'}
      <p class="m-0 text-sm">
        Its weights are already on this device, so reading downloads nothing.
      </p>
    {:else}
      <p class="m-0 text-sm">
        Its weights are not on this device. Reading fetches {weightsMb(view.model)} MB of weights from
        Hugging Face and up to {runtimeMb(view.model)} MB of ONNX Runtime from jsDelivr, and keeps them
        in this site's Cache API, where the reader finds them later.
        {#if view.presence === 'cache-unavailable'}
          The Cache API is not available here, so nothing would be kept.
        {/if}
      </p>
    {/if}
    <div class="row">{@render readButton(view.model, view.presence)}</div>
  {:else if view.kind === 'reading'}
    {#if view.load === null}
      <p class="m-0 text-sm text-muted">Opening the model in its worker…</p>
    {:else}
      <Progress
        label={`${loadVerb(view.load.source)} the model`}
        value={view.load.fraction}
        max={1}
      />
    {/if}
    {#if view.session !== null}
      <p class="m-0 text-sm">Running on the {deviceName(view.session.device)}.</p>
    {/if}
  {:else if view.kind === 'read'}
    <p class="m-0 text-lg" lang="ja">{view.text}</p>
    <p class="row wrap items-center gap-2 m-0 text-sm">
      <Badge>{Math.round(view.elapsedMs)} ms</Badge>
      {#if view.session !== null}
        <Badge>{deviceName(view.session.device)}</Badge>
        {#if view.session.fellBackFrom !== null}
          <Badge variant="warning">fell back from the {deviceName(view.session.fellBackFrom)}</Badge
          >
        {/if}
      {/if}
      <Badge>confidence: {view.confidence ?? 'null'}</Badge>
    </p>
    <div class="row">
      <Button variant="ghost" size="sm" onclick={() => void live.read()}>Read the selection</Button>
    </div>
  {:else}
    <Alert variant="danger" title="Not read">{view.message}</Alert>
    <div class="row">
      <Button variant="ghost" size="sm" onclick={() => void live.read()}>Try again</Button>
    </div>
  {/if}
  {#snippet caption()}
    Reads the region selected in the demo above through the same use case a capture uses. Nothing is
    written to your captures. The time includes opening the model the first time.
  {/snippet}
</DocsDemo>
