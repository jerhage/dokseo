<script lang="ts">
  import { filesFromDataTransfer } from '$lib/platform/files/dropped-files';

  type Props = {
    readonly busy: boolean;
    readonly onfiles: (files: readonly File[]) => void;
  };

  let { busy, onfiles }: Props = $props();

  let picker = $state<HTMLInputElement | null>(null);
  let folderPicker = $state<HTMLInputElement | null>(null);
  let over = $state(false);

  export function choose(): void {
    picker?.click();
  }

  function take(event: Event & { currentTarget: HTMLInputElement }): void {
    const input = event.currentTarget;
    const chosen = input.files === null ? [] : [...input.files];
    input.value = '';
    if (chosen.length === 0) return;
    onfiles(chosen);
  }

  function hover(event: DragEvent): void {
    event.preventDefault();
    over = true;
  }

  function leave(): void {
    over = false;
  }

  async function drop(event: DragEvent): Promise<void> {
    event.preventDefault();
    over = false;
    if (event.dataTransfer === null) return;
    const dropped = await filesFromDataTransfer(event.dataTransfer);
    if (dropped.length === 0) return;
    onfiles(dropped);
  }
</script>

<div class="tile">
  <button
    class="target"
    class:over
    class:busy
    type="button"
    disabled={busy}
    ondragover={hover}
    ondragenter={hover}
    ondragleave={leave}
    ondrop={drop}
    onclick={choose}
  >
    <span class="plus" aria-hidden="true">+</span>
    <span class="lead">{busy ? 'Adding…' : 'Drop a folder, .zip or .cbz'}</span>
    <span class="note">pages stay on your device</span>
  </button>

  <div class="caption">
    <p class="name">Add upload</p>
    <p class="hint">JPG, PNG, WebP, PDF</p>
    <button class="folder" type="button" disabled={busy} onclick={() => folderPicker?.click()}>
      Choose a folder instead
    </button>
  </div>

  <input
    bind:this={picker}
    class="hidden"
    type="file"
    multiple
    accept="image/*,.zip,.cbz,.pdf"
    onchange={take}
  />
  <input
    bind:this={folderPicker}
    class="hidden"
    type="file"
    multiple
    webkitdirectory
    onchange={take}
  />
</div>

<style>
  .tile {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    min-width: 0;
  }

  .target {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    aspect-ratio: 2 / 3;
    padding: var(--s-4);
    border: 1.5px dashed var(--c-border-7);
    border-radius: var(--r-md);
    background: var(--c-surface-chip);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    text-align: center;
    cursor: pointer;
  }

  .target:hover:not(:disabled),
  .target:focus-visible,
  .target.over {
    border-color: var(--c-accent-border);
    background: var(--c-accent-wash-faint);
  }

  .target:disabled {
    cursor: progress;
    opacity: 0.6;
  }

  .target.busy {
    border-style: solid;
    border-color: var(--c-accent-border-soft);
    background: var(--c-surface-card-quiet);
    color: var(--c-text-8);
    opacity: 0.45;
  }

  .plus {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1.5px solid var(--c-accent);
    border-radius: var(--r-md);
    color: var(--c-accent);
    font-size: 16px;
    line-height: 1;
  }

  .lead {
    font-size: 11.5px;
    line-height: 1.4;
  }

  .note {
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    line-height: 1.5;
  }

  .caption {
    display: flex;
    flex-direction: column;
    gap: var(--s-1);
  }

  .name {
    margin: 0;
    color: var(--c-text-7);
    font-family: var(--f-ui);
    font-size: 13px;
  }

  .hint {
    margin: 0;
    color: var(--c-text-10);
    font-family: var(--f-ui);
    font-size: 11px;
  }

  .folder {
    align-self: flex-start;
    padding: 0;
    border: 0;
    background: none;
    color: var(--c-accent);
    font-family: var(--f-ui);
    font-size: 11px;
    text-decoration: underline;
    cursor: pointer;
  }

  .folder:disabled {
    color: var(--c-text-10);
    cursor: progress;
  }

  .hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
