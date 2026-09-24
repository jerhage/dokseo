<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Dropzone from '$lib/components/Dropzone.svelte';
  import { filesFromDataTransfer } from '$lib/platform/files/dropped-files';
  import { ACCEPT_ATTRIBUTE, ACCEPTED_SUMMARY, DROP_INVITATION } from '../../accepted-formats';
  import { arrivedFiles, takeChosen } from '../chosen-files';

  type Props = {
    readonly busy: boolean;
    readonly onfiles: (files: readonly File[]) => void;
  };

  let { busy, onfiles }: Props = $props();

  let filePicker = $state<HTMLInputElement>();
  let folderPicker = $state<HTMLInputElement | null>(null);

  export function choose(): void {
    filePicker?.click();
  }

  function deliver(files: readonly File[]): void {
    if (files.length === 0) return;
    onfiles(files);
  }
</script>

<div class="col gap-2">
  <Dropzone
    bind:ref={filePicker}
    class="aspect-portrait"
    multiple
    accept={ACCEPT_ATTRIBUTE}
    readDrop={filesFromDataTransfer}
    disabled={busy}
    title={busy ? 'Adding…' : DROP_INVITATION}
    hint="pages stay on your device"
    onfiles={(selection) => deliver(arrivedFiles(selection))}
  />

  <div class="col items-start gap-1">
    <p class="text-sm">Add upload</p>
    <p class="text-xs text-faint">{ACCEPTED_SUMMARY}</p>
    <Button size="sm" variant="ghost" disabled={busy} onclick={() => folderPicker?.click()}>
      Choose a folder instead
    </Button>
  </div>

  <input
    bind:this={folderPicker}
    class="visually-hidden"
    type="file"
    multiple
    webkitdirectory
    aria-hidden="true"
    tabindex="-1"
    onchange={(event) => deliver(takeChosen(event.currentTarget))}
  />
</div>
