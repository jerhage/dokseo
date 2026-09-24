<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'type' | 'role' | 'class' | 'children'> & {
    class?: ClassValue;
    ref?: HTMLInputElement | undefined;
    children: Snippet;
  };

  let {
    checked = $bindable(false),
    ref = $bindable(),
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<label class={['toggle', className]}>
  <input
    {...rest}
    bind:this={ref}
    type="checkbox"
    role="switch"
    class="toggle-input"
    bind:checked
  />
  <span>{@render children()}</span>
</label>
