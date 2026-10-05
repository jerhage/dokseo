<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import FileItem from './FileItem.svelte';
  import type { FileItemData } from './file-item';

  type Props = Omit<HTMLAttributes<HTMLUListElement>, 'children'> & {
    items: readonly FileItemData[];
    onremove?: ((id: string) => void) | undefined;
    removeLabelFor?: ((name: string) => string) | undefined;
    cancelLabelFor?: ((name: string) => string) | undefined;
    progressLabelFor?: ((name: string) => string) | undefined;
  };

  let {
    items,
    onremove,
    removeLabelFor,
    cancelLabelFor,
    progressLabelFor,
    class: className,
    ...rest
  }: Props = $props();
</script>

<ul {...rest} class={['file-list', className]}>
  {#each items as item (item.id)}
    <FileItem
      {item}
      {onremove}
      removeLabel={removeLabelFor?.(item.name)}
      cancelLabel={cancelLabelFor?.(item.name)}
      progressLabel={progressLabelFor?.(item.name)}
    />
  {/each}
</ul>
