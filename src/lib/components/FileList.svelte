<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import FileItem from './FileItem.svelte';
  import type { FileItemData } from './file-item';

  type Props = Omit<HTMLAttributes<HTMLUListElement>, 'children'> & {
    items: readonly FileItemData[];
    onremove?: ((id: string) => void) | undefined;
    removeLabel?: ((name: string) => string) | undefined;
    cancelLabel?: ((name: string) => string) | undefined;
    progressLabel?: ((name: string) => string) | undefined;
  };

  let {
    items,
    onremove,
    removeLabel,
    cancelLabel,
    progressLabel,
    class: className,
    ...rest
  }: Props = $props();
</script>

<ul {...rest} class={['file-list', className]}>
  {#each items as item (item.id)}
    <FileItem {item} {onremove} {removeLabel} {cancelLabel} {progressLabel} />
  {/each}
</ul>
