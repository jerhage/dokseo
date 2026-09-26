<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import ChevronDown from './icons/ChevronDown.svelte';

  type Props = HTMLSelectAttributes & {
    ref?: HTMLSelectElement | undefined;
  };

  let {
    value = $bindable(),
    ref = $bindable(),
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<select {...rest} bind:this={ref} bind:value class={['select', className]}>
  {@render children?.()}
</select>
<ChevronDown class="select-icon" />
