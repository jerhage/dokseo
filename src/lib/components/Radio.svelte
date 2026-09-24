<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'type' | 'class' | 'children' | 'checked'> & {
    group?: HTMLInputAttributes['value'];
    class?: ClassValue;
    hint?: string | undefined;
    ref?: HTMLInputElement | undefined;
    children: Snippet;
  };

  let {
    group = $bindable(),
    ref = $bindable(),
    hint,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<label class={['radio-wrapper', className]}>
  <input {...rest} bind:this={ref} type="radio" class="radio-input" bind:group />
  <span class="radio-label">
    {@render children()}
    {#if hint !== undefined}
      <span class="field-hint">{hint}</span>
    {/if}
  </span>
</label>
