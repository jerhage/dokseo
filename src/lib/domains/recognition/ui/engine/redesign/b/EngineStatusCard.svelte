<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import { engineStatus } from '../../../../domain/engine/ocr-engine';
  import type { ModelFootprint } from '../../../../domain/model/model-footprint';
  import { cancelHint, loadFigure } from '../../engine-settings.svelte';
  import type { EngineSettingsView } from '../../engine-settings.svelte';
  import { engineActionOf, loadPercent, statusVariant } from '../engine-screen';
  import { alreadyHere, engineLine, footprintFacts } from './engine-page';

  type Props = { readonly view: EngineSettingsView; readonly model: ModelFootprint };

  let { view, model }: Props = $props();

  const uid = $props.id();

  const download = $derived(view.download);
  const loading = $derived(download.kind === 'loading');
  const progress = $derived(download.kind === 'loading' ? download.load : null);
  const failure = $derived(download.kind === 'failed' ? download.cause : null);
  const state = $derived(engineStatus(view.engine));
  const facts = $derived(footprintFacts(model));
  const kept = $derived(alreadyHere(view.partial));
  const action = $derived(
    engineActionOf({
      loading,
      stored: view.stored,
      resumable: view.resumable,
      confirmingRemoval: view.confirmingRemoval,
    }),
  );
</script>

<section class="surface bordered rounded-container col gap-4 p-5" aria-labelledby="{uid}-model">
  <div class="row items-start gap-3">
    <Avatar shape="square" size="lg" class="shrink-0" aria-hidden="true">
      <span lang="ja">字</span>
    </Avatar>
    <div class="col gap-1 flex-1">
      <h2 id="{uid}-model" class="text-base weight-semibold">{model.label}</h2>
      <p class="text-sm text-muted">{engineLine(model, view.session)}</p>
    </div>
    <Badge dot variant={statusVariant(state.tone)} class="shrink-0">{state.label}</Badge>
  </div>

  <p class="text-sm">{state.note}</p>

  {#if loading}
    <div class="col gap-2 surface-sunken rounded-control p-3">
      <div class="row wrap items-center justify-between gap-2">
        <span class="text-sm">{model.label} weights</span>
        <span class="mono text-xs text-muted">{loadFigure(progress)}</span>
      </div>
      <Progress
        label="{state.label} the recognition model"
        value={progress === null ? undefined : loadPercent(progress)}
      />
      <div class="row wrap items-center gap-2">
        <span class="flex-fill text-xs text-muted">{cancelHint(progress)}</span>
        <Button size="sm" onclick={() => void view.pause()}>Pause</Button>
        <Button size="sm" onclick={() => void view.stop()}>Cancel</Button>
      </div>
    </div>
  {/if}

  {#if failure !== null}
    <Alert variant="danger">The model could not be loaded: {failure}</Alert>
  {/if}

  {#if action.kind === 'download'}
    <div class="row wrap gap-2">
      <Button variant="primary" onclick={() => void view.start()}>Download now</Button>
    </div>
  {:else if action.kind === 'resume'}
    <div class="row wrap items-center gap-2">
      <Button variant="primary" onclick={() => void view.start()}>Resume the download</Button>
      <Button onclick={() => void view.stop()}>Discard what was fetched</Button>
      {#if kept !== null}
        <span class="text-xs text-muted">{kept}</span>
      {/if}
    </div>
  {/if}

  <dl class="grid-3 grid-auto-sm border-t pt-4">
    {#each facts as fact (fact.term)}
      <div class="col gap-1">
        <dt class="text-xs text-muted">{fact.term}</dt>
        <dd class="mono text-sm">{fact.detail}</dd>
      </div>
    {/each}
  </dl>
</section>
