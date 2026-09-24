<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'children'> & {
    ref?: HTMLInputElement | undefined;
  };

  let { value = $bindable(), ref = $bindable(), class: className, ...rest }: Props = $props();
</script>

<input {...rest} bind:this={ref} bind:value class={['input', className]} />
