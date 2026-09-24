<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'type' | 'role' | 'class' | 'children'> & {
    class?: ClassValue;
    children: Snippet;
  };

  let { checked = $bindable(false), class: className, children, ...rest }: Props = $props();
</script>

<label class={['toggle', className]}>
  <input {...rest} type="checkbox" role="switch" class="toggle-input" bind:checked />
  <span>{@render children()}</span>
</label>
