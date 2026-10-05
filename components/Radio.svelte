<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';
  import { RADIO_VARIANTS } from './classes';
  import type { RadioVariant } from './classes';

  type Labelling =
    | { children: Snippet; hint?: string | undefined; variant?: RadioVariant }
    | {
        children?: undefined;
        hint?: undefined;
        variant?: undefined;
        'aria-labelledby': string;
      }
    | { children?: undefined; hint?: undefined; variant?: undefined; 'aria-label': string };

  type Props = Omit<HTMLInputAttributes, 'type' | 'class' | 'children' | 'checked'> &
    Labelling & {
      group?: HTMLInputAttributes['value'];
      class?: ClassValue;
      ref?: HTMLInputElement | null | undefined;
    };

  let {
    group = $bindable(),
    ref = $bindable(),
    hint,
    variant = 'default',
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

{#if children === undefined}
  <input {...rest} bind:this={ref} type="radio" class={['radio-input', className]} bind:group />
{:else}
  <label class={['radio-wrapper', RADIO_VARIANTS[variant], className]}>
    <input {...rest} bind:this={ref} type="radio" class="radio-input" bind:group />
    <span class="radio-label">
      {@render children()}
      {#if hint !== undefined}
        <span class="field-hint">{hint}</span>
      {/if}
    </span>
  </label>
{/if}
