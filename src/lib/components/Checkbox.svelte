<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';
  import Check from './icons/Check.svelte';
  import Minus from './icons/Minus.svelte';

  type Props = Omit<HTMLInputAttributes, 'type' | 'class' | 'children'> & {
    class?: ClassValue;
    hint?: string | undefined;
    ref?: HTMLInputElement | undefined;
    children: Snippet;
  };

  let {
    checked = $bindable(false),
    indeterminate = $bindable(false),
    ref = $bindable(),
    hint,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<label class={['checkbox-wrapper', className]}>
  <input
    {...rest}
    bind:this={ref}
    type="checkbox"
    class="checkbox-input"
    bind:checked
    bind:indeterminate
  />
  <Check class="checkbox-mark checkbox-check" />
  <Minus class="checkbox-mark checkbox-dash" />
  <span class="checkbox-label">
    {@render children()}
    {#if hint !== undefined}
      <span class="field-hint">{hint}</span>
    {/if}
  </span>
</label>
