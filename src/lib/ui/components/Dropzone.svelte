<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';
  import { DROPZONE_SIZES } from './classes';
  import type { DropzoneSize } from './classes';
  import { readDropped } from './drop-reading';
  import type { DropReader } from './drop-reading';
  import { acceptRules, selectFiles } from './file-selection';
  import Upload from './icons/Upload.svelte';
  import type { FileSelection } from './file-selection';

  type Props = Omit<
    HTMLInputAttributes,
    | 'type'
    | 'class'
    | 'children'
    | 'title'
    | 'accept'
    | 'multiple'
    | 'disabled'
    | 'onchange'
    | 'size'
  > & {
    class?: ClassValue;
    title?: string | Snippet;
    hint?: string | undefined;
    accept?: string | undefined;
    multiple?: boolean;
    maxSize?: number | undefined;
    disabled?: boolean;
    size?: DropzoneSize;
    invalid?: boolean;
    directory?: boolean;
    readDrop?: DropReader<DataTransfer, File> | undefined;
    ref?: HTMLInputElement | null | undefined;
    onfiles: (selection: FileSelection<File>) => void;
  };

  let {
    title,
    hint,
    accept,
    multiple = false,
    maxSize,
    disabled = false,
    size = 'md',
    invalid = false,
    directory = false,
    readDrop,
    ref = $bindable(),
    onfiles,
    class: className,
    ...rest
  }: Props = $props();

  let dragging = $state(false);
  let directoryPicker = $state<HTMLInputElement | null>(null);

  export function chooseDirectory(): void {
    directoryPicker?.click();
  }

  const policy = $derived({ rules: acceptRules(accept), maxSize, multiple });

  function report(files: readonly File[]): void {
    if (files.length === 0) return;
    onfiles(selectFiles(files, policy));
  }

  function hover(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer !== null) event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
    dragging = !disabled;
  }

  function leave(event: DragEvent & { currentTarget: HTMLLabelElement }): void {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    dragging = false;
  }

  async function drop(event: DragEvent): Promise<void> {
    event.preventDefault();
    dragging = false;
    if (disabled || event.dataTransfer === null) return;
    const pending = readDropped(event.dataTransfer, readDrop);
    report(await pending);
  }

  function choose(event: Event & { currentTarget: HTMLInputElement }): void {
    const input = event.currentTarget;
    const chosen = input.files === null ? [] : [...input.files];
    input.value = '';
    report(chosen);
  }
</script>

<label
  class={[
    'dropzone',
    DROPZONE_SIZES[size],
    { 'is-dragover': dragging, 'is-invalid': invalid },
    className,
  ]}
  ondragenter={hover}
  ondragover={hover}
  ondragleave={leave}
  ondrop={drop}
>
  <input
    {...rest}
    bind:this={ref}
    aria-invalid={invalid ? 'true' : rest['aria-invalid']}
    type="file"
    class="dropzone-input"
    {accept}
    {multiple}
    {disabled}
    onchange={choose}
  />
  {#if directory}
    <input
      bind:this={directoryPicker}
      type="file"
      class="dropzone-input"
      multiple
      webkitdirectory
      aria-hidden="true"
      tabindex="-1"
      {disabled}
      onchange={choose}
    />
  {/if}
  <span class="dropzone-icon-frame" aria-hidden="true"><Upload class="dropzone-icon" /></span>
  <span class="dropzone-title">
    {#if title === undefined}
      Drop files here or <span class="dropzone-action">browse</span>
    {:else if typeof title === 'string'}
      {title}
    {:else}
      {@render title()}
    {/if}
  </span>
  {#if hint !== undefined}
    <span class="dropzone-hint">{hint}</span>
  {/if}
</label>
