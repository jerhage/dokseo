<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { KEY_HINTS_SIZES, KEY_HINTS_VARIANTS, KEY_JOINER, hintText } from './key-hints';
  import type { KeyHint, KeyHintsElement, KeyHintsSize, KeyHintsVariant } from './key-hints';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children' | 'aria-hidden'> & {
    hints: readonly KeyHint[];
    variant?: KeyHintsVariant;
    size?: KeyHintsSize;
    element?: KeyHintsElement;
    decorative?: boolean;
  };

  let {
    hints,
    variant = 'chips',
    size = 'md',
    element = 'p',
    decorative = false,
    class: className,
    ...rest
  }: Props = $props();
</script>

<svelte:element
  this={element}
  {...rest}
  aria-hidden={decorative ? 'true' : undefined}
  class={['key-hints', KEY_HINTS_VARIANTS[variant], KEY_HINTS_SIZES[size], className]}
>
  {#if variant === 'text'}
    {hintText(hints)}
  {:else}
    {#each hints as hint, place (place)}
      <span class="key-hint">
        {#each hint.keys as key, step (step)}
          {#if step > 0}<span class="key-hint-joiner">{KEY_JOINER}</span>{/if}
          <kbd>{key}</kbd>
        {/each}
        <span class="key-hint-does">{hint.does}</span>
      </span>
    {/each}
  {/if}
</svelte:element>
