<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'type' | 'class' | 'children'> & {
    class?: ClassValue;
    hint?: string;
    children: Snippet;
  };

  let {
    checked = $bindable(false),
    indeterminate = $bindable(false),
    hint,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<label class={['checkbox-wrapper', className]}>
  <input {...rest} type="checkbox" class="checkbox-input" bind:checked bind:indeterminate />
  <span class="checkbox-label">
    {@render children()}
    {#if hint !== undefined}
      <span class="field-hint">{hint}</span>
    {/if}
  </span>
</label>
