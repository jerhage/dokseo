<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { IconProps } from './icons/icon';

  type Face =
    | { icon: Component<IconProps>; children?: Snippet }
    | { icon?: undefined; children: Snippet };

  type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & Face;

  let { icon: Icon, class: className, children, ...rest }: Props = $props();
</script>

<span {...rest} class={['input-group-addon', className]}>
  {#if Icon !== undefined}
    <Icon class="input-group-addon-icon" />
  {/if}
  {@render children?.()}
</span>
