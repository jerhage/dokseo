<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';

  type Props = HTMLSelectAttributes;

  let { value = $bindable(), class: className, children, ...rest }: Props = $props();
</script>

<select {...rest} bind:value class={['select', className]}>
  {@render children?.()}
</select>
