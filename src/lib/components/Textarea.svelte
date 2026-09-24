<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  type Props = Omit<HTMLTextareaAttributes, 'children'>;

  let { value = $bindable(), class: className, ...rest }: Props = $props();
</script>

<textarea {...rest} bind:value class={['textarea', className]}></textarea>
