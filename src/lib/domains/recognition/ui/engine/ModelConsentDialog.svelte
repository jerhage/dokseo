<script lang="ts">
  import { megabytes } from '$lib/shared/bytes';
  import { languageName } from '$lib/shared/language';
  import { downloadMb, onDiskMb } from '../../domain/model/model-footprint';
  import type { ConsentRequest } from './recognizer-view.svelte';

  type Props = {
    readonly request: ConsentRequest;
    readonly onagree: () => void;
    readonly ondecline: () => void;
  };

  let { request, onagree, ondecline }: Props = $props();

  const uid = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let accepted = false;
  let answered = false;

  const name = $derived(languageName(request.language));
  const download = $derived(downloadMb(request.footprint));
  const disk = $derived(onDiskMb(request.footprint));
  const weights = $derived(megabytes(request.footprint.weightsBytes));
  const runtime = $derived(megabytes(request.footprint.runtimeDownloadBytes, 1));
  const unpacked = $derived(megabytes(request.footprint.runtimeOnDiskBytes));

  $effect(() => {
    const node = dialog;
    if (node === null || node.open) return;
    node.showModal();
  });

  function answer(): void {
    if (answered) return;
    answered = true;
    if (accepted) onagree();
    else ondecline();
  }

  function accept(): void {
    accepted = true;
    dialog?.close();
  }

  function refuse(): void {
    dialog?.close();
  }

  function backdrop(event: MouseEvent): void {
    if (event.target === dialog) refuse();
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="{uid}-heading"
  aria-describedby="{uid}-lead"
  onclick={backdrop}
  onclose={answer}
>
  <div class="panel">
    <h2 class="heading" id="{uid}-heading">Download the {name} recognition model?</h2>

    <p class="lead" id="{uid}-lead">
      Reading a selection needs the {name} recognition model. It is downloaded once and then kept on this
      device.
    </p>

    <dl class="cost">
      <div class="figure">
        <dt class="label">Download</dt>
        <dd class="amount">about {download} MB</dd>
      </div>
      <div class="figure">
        <dt class="label">On disk</dt>
        <dd class="amount">about {disk} MB</dd>
      </div>
    </dl>

    <p class="detail">
      The weights are {weights} MB and barely compress, so they cost that much either way. The runtime
      is {runtime} MB to download and unpacks to as much as {unpacked} MB, which is why the disk figure
      is the larger one.
    </p>

    <p class="detail">
      Recognition runs on this device. No page image and no recognized text leaves it.
    </p>

    <p class="detail">
      The browser can reclaim this storage unless it grants persistence. If it does, the model is
      downloaded again the next time you read a selection.
    </p>

    <div class="actions">
      <button class="decline" type="button" onclick={refuse}>Not now</button>
      <button class="agree" type="button" onclick={accept}>Download and read</button>
    </div>
  </div>
</dialog>

<style>
  dialog {
    width: min(420px, calc(100% - var(--s-5)));
    max-height: 86vh;
    margin: auto;
    padding: 0;
    overflow: auto;
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-7);
    background: var(--c-surface-popover);
    color: var(--c-text-2);
  }

  dialog::backdrop {
    background: color-mix(in srgb, var(--c-surface-void) 72%, transparent);
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
    padding: var(--s-5);
    font-family: var(--f-ui);
  }

  .heading {
    margin: 0;
    color: var(--c-text-1);
    font-size: 15px;
    font-weight: 500;
  }

  .lead {
    margin: calc(var(--s-3) * -1) 0 0;
    color: var(--c-text-4);
    font-size: 12.5px;
    line-height: 1.6;
  }

  .cost {
    display: flex;
    gap: var(--s-2);
    margin: 0;
  }

  .figure {
    flex: 1 1 0;
    padding: var(--s-3);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-4);
    background: var(--c-surface-chip);
  }

  .label {
    color: var(--c-text-6);
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .amount {
    margin: var(--s-1) 0 0;
    color: var(--c-text-1);
    font-family: var(--f-mono);
    font-size: 13px;
  }

  .detail {
    margin: calc(var(--s-3) * -1) 0 0;
    color: var(--c-text-7);
    font-size: 11.5px;
    line-height: 1.6;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--s-2);
    margin-top: var(--s-1);
  }

  .decline,
  .agree {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-4);
    font-family: var(--f-ui);
    font-size: 12px;
    cursor: pointer;
  }

  .decline {
    border: 1px solid var(--c-border-4);
    background: var(--c-surface-button);
    color: var(--c-text-5);
  }

  .agree {
    border: 1px solid var(--c-accent);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-weight: 600;
  }
</style>
