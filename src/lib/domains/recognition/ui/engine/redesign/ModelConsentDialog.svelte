<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import { megabytes } from '$lib/shared/bytes';
  import { languageName } from '$lib/shared/language';
  import { downloadMb, onDiskMb } from '../../../domain/model/model-footprint';
  import type { ConsentRequest } from '../recognizer-view.svelte';

  type Props = {
    readonly request: ConsentRequest;
    readonly onagree: () => void;
    readonly ondecline: () => void;
  };

  let { request, onagree, ondecline }: Props = $props();

  const uid = $props.id();

  let open = $state(true);
  let accepted = false;
  let answered = false;

  const name = $derived(languageName(request.language));
  const download = $derived(downloadMb(request.footprint));
  const disk = $derived(onDiskMb(request.footprint));
  const weights = $derived(megabytes(request.footprint.weightsBytes));
  const runtime = $derived(megabytes(request.footprint.runtimeDownloadBytes, 1));
  const unpacked = $derived(megabytes(request.footprint.runtimeOnDiskBytes));

  function answer(): void {
    if (answered) return;
    answered = true;
    if (accepted) onagree();
    else ondecline();
  }

  function accept(): void {
    accepted = true;
    open = false;
  }
</script>

<Modal bind:open aria-labelledby="{uid}-heading" aria-describedby="{uid}-lead" onclose={answer}>
  {#snippet header()}
    <div class="modal-header">
      <h2 class="modal-title" id="{uid}-heading">Download the {name} recognition model?</h2>
    </div>
  {/snippet}

  <p id="{uid}-lead">
    Reading a selection needs the {name} recognition model. It is downloaded once and then kept on this
    device.
  </p>

  <dl class="grid-2-col gap-2">
    <div class="col gap-1 p-3 surface-sunken bordered rounded-control">
      <dt class="text-xs uppercase tracking-wide">Download</dt>
      <dd class="mono text-sm">about {download} MB</dd>
    </div>
    <div class="col gap-1 p-3 surface-sunken bordered rounded-control">
      <dt class="text-xs uppercase tracking-wide">On disk</dt>
      <dd class="mono text-sm">about {disk} MB</dd>
    </div>
  </dl>

  <p class="text-xs">
    The weights are {weights} MB and barely compress, so they cost that much either way. The runtime is
    {runtime} MB to download and unpacks to as much as {unpacked} MB, which is why the disk figure is
    the larger one.
  </p>

  <p class="text-xs">
    Recognition runs on this device. No page image and no recognized text leaves it.
  </p>

  <p class="text-xs">
    The browser can reclaim this storage unless it grants persistence. If it does, the model is
    downloaded again the next time you read a selection.
  </p>

  {#snippet footer(hide)}
    <Button size="sm" onclick={hide}>Not now</Button>
    <Button size="sm" variant="primary" onclick={accept}>Download and read</Button>
  {/snippet}
</Modal>
