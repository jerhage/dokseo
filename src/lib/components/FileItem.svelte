<script lang="ts">
  import { match } from 'ts-pattern';
  import type { HTMLLiAttributes } from 'svelte/elements';
  import CircleCheck from './icons/CircleCheck.svelte';
  import CircleX from './icons/CircleX.svelte';
  import File from './icons/File.svelte';
  import X from './icons/X.svelte';
  import Progress from './Progress.svelte';
  import { fileItemView } from './file-item';
  import type { FileItemData } from './file-item';

  type Props = Omit<HTMLLiAttributes, 'children'> & {
    item: FileItemData;
    onremove?: ((id: string) => void) | undefined;
    removeLabel?: string | undefined;
    cancelLabel?: string | undefined;
    progressLabel?: string | undefined;
  };

  let {
    item,
    onremove,
    removeLabel,
    cancelLabel = 'Cancel upload',
    progressLabel,
    class: className,
    ...rest
  }: Props = $props();

  const view = $derived(fileItemView(item));
  const Mark = $derived(
    match(view.mark)
      .with('file', () => File)
      .with('complete', () => CircleCheck)
      .with('error', () => CircleX)
      .exhaustive(),
  );
  const actionLabel = $derived(
    view.removal === 'cancel' ? cancelLabel : (removeLabel ?? `Remove ${item.name}`),
  );
  const uploadingLabel = $derived(progressLabel ?? `Uploading ${item.name}`);
</script>

<li {...rest} class={['file-item', view.classes, className]}>
  <span class="file-item-icon-frame" aria-hidden="true"><Mark class="file-item-icon" /></span>
  <div class="file-item-content">
    <span class="file-item-name">{item.name}</span>
    {#if view.detail.kind === 'progress'}
      <Progress label={uploadingLabel} value={view.detail.value} size="sm" />
    {:else}
      <span class="file-item-detail">{view.detail.text}</span>
    {/if}
  </div>
  {#if onremove !== undefined}
    <button
      type="button"
      class="file-item-remove"
      aria-label={actionLabel}
      onclick={() => onremove(item.id)}
    >
      <X class="close-icon" />
    </button>
  {/if}
</li>
