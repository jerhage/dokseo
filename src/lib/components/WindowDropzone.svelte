<script lang="ts">
  import type { Snippet } from 'svelte';
  import { readDropped } from './drop-reading';
  import type { DropReader } from './drop-reading';
  import Upload from './icons/Upload.svelte';
  import { IDLE_DRAG, carriesFiles, dropped, entered, left } from './window-drag';
  import type { WindowDrag } from './window-drag';

  type Props = {
    disabled?: boolean;
    readDrop?: DropReader<DataTransfer, File> | undefined;
    onfiles: (files: readonly File[]) => void;
    children: Snippet;
  };

  let { disabled = false, readDrop, onfiles, children }: Props = $props();

  let drag = $state<WindowDrag>(IDLE_DRAG);

  const showing = $derived(drag.kind === 'carrying' && !disabled);

  function raise(overlay: HTMLElement): void {
    overlay.showPopover();
  }

  function withFiles(event: DragEvent): event is DragEvent & { dataTransfer: DataTransfer } {
    return event.dataTransfer !== null && carriesFiles(event.dataTransfer.types);
  }

  function enter(event: DragEvent): void {
    if (withFiles(event)) drag = entered(drag);
  }

  function leave(): void {
    drag = left(drag);
  }

  function hover(event: DragEvent): void {
    if (event.defaultPrevented || !withFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
  }

  async function drop(event: DragEvent): Promise<void> {
    drag = dropped();
    if (event.defaultPrevented || !withFiles(event)) return;
    event.preventDefault();
    if (disabled) return;
    const pending = readDropped(event.dataTransfer, readDrop);
    const files = await pending;
    if (files.length > 0) onfiles(files);
  }
</script>

<svelte:window ondragenter={enter} ondragover={hover} ondragleave={leave} ondrop={drop} />

{#if showing}
  <div class="window-drop" popover="manual" aria-hidden="true" {@attach raise}>
    <div class="window-drop-panel">
      <span class="dropzone-icon"><Upload class="dropzone-mark" /></span>
      <span class="dropzone-title">{@render children()}</span>
    </div>
  </div>
{/if}
