<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'children'>;

  let { value = $bindable(), class: className, ...rest }: Props = $props();
</script>

<input {...rest} bind:value class={['input', className]} />
