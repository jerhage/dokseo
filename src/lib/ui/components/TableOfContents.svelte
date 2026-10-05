<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ContentsEntry } from './table-of-contents';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> & {
    entries: readonly ContentsEntry[];
    title?: string;
    heading?: 'h2' | 'h3' | 'h4';
  };

  let {
    entries,
    title = 'On this page',
    heading = 'h2',
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();
</script>

<nav {...rest} class={['table-of-contents', className]} aria-labelledby="{uid}-title">
  <svelte:element this={heading} class="table-of-contents-title eyebrow" id="{uid}-title"
    >{title}</svelte:element
  >
  <ol class="table-of-contents-list">
    {#each entries as entry (entry.id)}
      <li class={{ 'table-of-contents-item-nested': entry.level === 3 }}>
        <a class="table-of-contents-link" href={entry.href}>{entry.title}</a>
      </li>
    {/each}
  </ol>
</nav>
