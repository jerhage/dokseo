<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Dropzone from '$lib/components/Dropzone.svelte';
  import type { FileSelection } from '$lib/components/file-selection';
  import { filesFromDataTransfer } from '$lib/platform/files/dropped-files';
  import { ACCEPT_ATTRIBUTE, ACCEPTED_SUMMARY, DROP_INVITATION } from './accepted-formats';

  type Props = {
    readonly busy: boolean;
    readonly compact: boolean;
    readonly onfiles: (selection: FileSelection<File>) => void;
  };

  let { busy, compact, onfiles }: Props = $props();

  let filePicker = $state<HTMLInputElement>();
  let dropzone = $state<ReturnType<typeof Dropzone> | null>(null);

  export function choose(): void {
    filePicker?.click();
  }
</script>

<section class="col gap-2" aria-label="Add to your library">
  <Dropzone
    bind:this={dropzone}
    bind:ref={filePicker}
    multiple
    directory
    size={compact ? 'sm' : 'md'}
    accept={ACCEPT_ATTRIBUTE}
    readDrop={filesFromDataTransfer}
    disabled={busy}
    title={busy ? 'Adding…' : DROP_INVITATION}
    hint="pages stay on your device"
    {onfiles}
  />

  <div class="row wrap items-center justify-between gap-2">
    <p class="text-xs text-faint">{ACCEPTED_SUMMARY}</p>
    <Button size="sm" variant="ghost" disabled={busy} onclick={() => dropzone?.chooseDirectory()}>
      Choose a folder instead
    </Button>
  </div>
</section>
