<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { LIST_GROUP_VARIANTS } from './list-group';
  import type { ListGroupVariant } from './list-group';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    label?: string | undefined;
    heading?: 'h2' | 'h3' | 'h4';
    variant?: ListGroupVariant;
    children: Snippet;
    summary?: Snippet;
  };

  let {
    label,
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
  this={label === undefined ? 'div' : 'section'}
  {...rest}
  class={['list-group', LIST_GROUP_VARIANTS[variant], className]}
  aria-labelledby={label === undefined ? undefined : `${uid}-label`}
>
  {#if label !== undefined}
    <svelte:element this={heading} class="list-group-label" id="{uid}-label">{label}</svelte:element
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
