<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { LIST_GROUP_VARIANTS } from './list-group';
  import type { ListGroupVariant } from './list-group';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    title?: string | undefined;
    heading?: 'h2' | 'h3' | 'h4';
    variant?: ListGroupVariant;
    children: Snippet;
    summary?: Snippet;
  };

  let {
    title,
    heading = 'h2',
    variant = 'separated',
    children,
    summary,
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();
</script>

<svelte:element
  this={title === undefined ? 'div' : 'section'}
  {...rest}
  class={['list-group', LIST_GROUP_VARIANTS[variant], className]}
  aria-labelledby={title === undefined ? undefined : `${uid}-title`}
>
  {#if title !== undefined}
    <svelte:element this={heading} class="list-group-title eyebrow" id="{uid}-title"
      >{title}</svelte:element
    >
  {/if}
  <div class="list-group-box">
    <ul class="list-group-list">
      {@render children()}
    </ul>
    {#if summary !== undefined}
      <dl class="list-group-summary">
        {@render summary()}
      </dl>
    {/if}
  </div>
</svelte:element>
