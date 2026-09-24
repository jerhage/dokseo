<script lang="ts">
  import type { HTMLLiAttributes } from 'svelte/elements';
  import Progress from './Progress.svelte';
  import { fileItemView } from './file-item';
  import type { FileItemData } from './file-item';

  type Props = Omit<HTMLLiAttributes, 'children'> & {
    item: FileItemData;
    onremove?: ((id: string) => void) | undefined;
    removeLabel?: ((name: string) => string) | undefined;
    cancelLabel?: ((name: string) => string) | undefined;
    progressLabel?: ((name: string) => string) | undefined;
  };

  let {
    item,
    onremove,
    removeLabel = (name) => `Remove ${name}`,
    cancelLabel = () => 'Cancel upload',
    progressLabel = (name) => `Uploading ${name}`,
    class: className,
    ...rest
  }: Props = $props();

  const view = $derived(fileItemView(item));
  const actionLabel = $derived(
    view.removal === 'cancel' ? cancelLabel(item.name) : removeLabel(item.name),
  );
</script>

<li {...rest} class={['file-item', view.classes, className]}>
  <span class="file-item-icon" aria-hidden="true"></span>
  <div class="file-item-meta">
    <span class="file-item-name">{item.name}</span>
    {#if view.detail.kind === 'progress'}
      <Progress label={progressLabel(item.name)} value={view.detail.value} size="sm" />
    {:else}
      <span class="file-item-size">{view.detail.text}</span>
    {/if}
  </div>
  {#if onremove !== undefined}
    <button
      type="button"
      class="file-item-remove"
      aria-label={actionLabel}
      onclick={() => onremove(item.id)}
    ></button>
  {/if}
</li>
