<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';
  import { readDropped } from './drop-reading';
  import type { DropReader } from './drop-reading';
  import { acceptRules, selectFiles } from './file-selection';
  import type { FileSelection } from './file-selection';

  type Props = Omit<
    HTMLInputAttributes,
    'type' | 'class' | 'children' | 'title' | 'accept' | 'multiple' | 'disabled' | 'onchange'
  > & {
    class?: ClassValue;
    title?: string | Snippet;
    hint?: string | undefined;
    accept?: string | undefined;
    multiple?: boolean;
    maxSize?: number | undefined;
    disabled?: boolean;
    compact?: boolean;
    invalid?: boolean;
    readDrop?: DropReader<DataTransfer, File> | undefined;
    onfiles: (selection: FileSelection<File>) => void;
  };

  let {
    title,
    hint,
    accept,
    multiple = false,
    maxSize,
    disabled = false,
    compact = false,
    invalid = false,
    readDrop,
    onfiles,
    class: className,
    ...rest
  }: Props = $props();

  let dragging = $state(false);

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
    { 'dropzone-compact': compact, 'is-dragover': dragging, 'is-invalid': invalid },
    className,
  ]}
  ondragenter={hover}
  ondragover={hover}
  ondragleave={leave}
  ondrop={drop}
>
  <input
    {...rest}
    aria-invalid={invalid ? 'true' : rest['aria-invalid']}
    type="file"
    class="dropzone-input"
    {accept}
    {multiple}
    {disabled}
    onchange={choose}
  />
  <span class="dropzone-icon" aria-hidden="true"></span>
  <span class="dropzone-title">
    {#if title === undefined}
      Drop files here or <span class="dropzone-browse">browse</span>
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
