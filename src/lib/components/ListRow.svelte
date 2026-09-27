<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import {
    LIST_ROW_LAYOUTS,
    LIST_ROW_SIZES,
    LIST_ROW_VALUE_TONES,
    listRowLayout,
  } from './list-group';
  import type { ListRowSize, ListRowValueTone } from './list-group';

  type Trailing =
    | { value?: undefined; valueTone?: undefined; actions?: undefined }
    | { value: string; valueTone?: ListRowValueTone; actions?: undefined }
    | { value?: undefined; valueTone?: undefined; actions: Snippet };

  type Placement =
    | { listed?: false; children?: Snippet }
    | { listed: true; children?: undefined; actions?: undefined };

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> &
    Trailing &
    Placement & {
      title: string;
      description?: string | undefined;
      size?: ListRowSize;
      strong?: boolean;
    };

  let {
    title,
    description,
    value,
    valueTone = 'default',
    actions,
    listed = false,
    size = 'md',
    strong = false,
    children,
    class: className,
    ...rest
  }: Props = $props();

  const layout = $derived(LIST_ROW_LAYOUTS[listRowLayout(actions)]);
  const rowClass = $derived(['list-row', LIST_ROW_SIZES[size], { 'list-row-strong': strong }]);
  const valueClass = $derived(['list-row-value', LIST_ROW_VALUE_TONES[valueTone]]);
</script>

{#snippet text()}
  <span class="list-row-title">{title}</span>
  {#if description !== undefined}
    <span class="list-row-description">{description}</span>
  {/if}
{/snippet}

{#if listed}
  <div {...rest} class={[rowClass, 'list-row-main', layout, className]}>
    <dt class="list-row-text">{@render text()}</dt>
    {#if value !== undefined}
      <dd class={valueClass}>{value}</dd>
    {/if}
  </div>
{:else}
  <li {...rest} class={[rowClass, 'list-row-stack', className]}>
    <div class={['list-row-main', layout]}>
      <div class="list-row-text">{@render text()}</div>
      {#if value !== undefined}
        <span class={valueClass}>{value}</span>
      {/if}
      {@render actions?.()}
    </div>
    {@render children?.()}
  </li>
{/if}
