<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  type Props = Omit<HTMLTextareaAttributes, 'children'> & {
    ref?: HTMLTextAreaElement | null | undefined;
  };

  let { value = $bindable(), ref = $bindable(), class: className, ...rest }: Props = $props();
</script>

<textarea {...rest} bind:this={ref} bind:value class={['textarea', className]}></textarea>
