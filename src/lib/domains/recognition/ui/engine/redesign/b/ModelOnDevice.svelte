<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import type { ModelFootprint } from '../../../../domain/model/model-footprint';
  import { partialFigure, REMOVAL_WARNING } from '../../engine-settings.svelte';
  import type { EngineSettingsView } from '../../engine-settings.svelte';
  import { removalMb } from '../engine-screen';
  import { storedLine } from './engine-page';

  type Props = {
    readonly view: EngineSettingsView;
    readonly model: ModelFootprint;
    readonly storageHref: string;
  };

  let { view, model, storageHref }: Props = $props();

  const uid = $props.id();

  const storage = $derived(view.storage);
  const line = $derived(storedLine(storage, view.storageMessage));
  const partial = $derived(partialFigure(view.partial, view.stored));
  const row = 'px-4 py-3 border-t';
</script>

<section class="col gap-2" aria-labelledby="{uid}-heading">
  <h2 id="{uid}-heading" class="px-1 text-xs uppercase tracking-wide text-muted weight-semibold">
    On this device
  </h2>
  <ul class="list-reset surface bordered rounded-container overflow-hidden">
    <li class="row wrap items-center justify-between gap-3 px-4 py-3">
      <span class="text-sm">Stored on this device</span>
      <span class={line.kind === 'measured' ? 'mono text-sm' : 'text-sm text-muted'}>
        {line.text}
      </span>
    </li>
    {#if partial !== null}
      <li class={['text-xs text-muted', row]}>{partial}</li>
    {/if}
    {#if storage !== null && !storage.persisted}
      <li class={['row items-start gap-3', row]}>
        <Badge variant="warning" dot class="shrink-0">May be cleared</Badge>
        <span class="text-xs text-muted">
          The browser has not granted persistence, so it may reclaim this space on its own.
        </span>
      </li>
    {/if}
    <li class={['row wrap items-center justify-between gap-3', row]}>
      <span class="flex-fill text-xs text-muted">
        This is what the model occupies, not what the app does. Storage accounts for every megabyte
        on this device.
      </span>
      <Button href={storageHref} size="sm" variant="outline">Storage</Button>
    </li>
    {#if view.stored}
      <li class={row}>
        <Button
          variant="ghost-danger"
          size="sm"
          disabled={view.removing}
          onclick={() => view.askRemoval()}
        >
          {view.removing ? 'Deleting…' : 'Delete the model'}
        </Button>
      </li>
    {/if}
  </ul>
  {#if view.message !== null}
    <p class="px-1 text-xs text-muted" role="status">{view.message}</p>
  {/if}
</section>

{#if view.stored}
  <Modal
    open={view.confirmingRemoval}
    title="Delete about {removalMb(storage, model)} MB of weights?"
    size="sm"
    onclose={() => view.dismissRemoval()}
  >
    <p class="text-sm">{REMOVAL_WARNING}</p>
    {#snippet footer(hide)}
      <Button onclick={hide}>Keep it</Button>
      <Button variant="danger" onclick={() => void view.remove()}>Delete the model</Button>
    {/snippet}
  </Modal>
{/if}
