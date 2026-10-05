<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { KEY_HINTS_SIZES, KEY_HINTS_VARIANTS, KEY_JOINER, hintsBody } from './key-hints';
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

  const body = $derived(hintsBody(variant, hints));
</script>

<svelte:element
  this={element}
  {...rest}
  aria-hidden={decorative ? 'true' : undefined}
  class={['key-hints', KEY_HINTS_VARIANTS[variant], KEY_HINTS_SIZES[size], className]}
>
  {#if body.kind === 'text'}
    {body.text}
  {:else if body.kind === 'inline'}
    {#each body.pieces as piece, place (place)}{#if piece.kind === 'key'}<kbd>{piece.text}</kbd
        >{:else}{piece.text}{/if}{/each}
  {:else}
    {#each hints as hint, place (place)}
      <span class="key-hints-item">
        {#each hint.keys as key, step (step)}
          {#if step > 0}<span class="key-hints-joiner">{KEY_JOINER}</span>{/if}
          <kbd>{key}</kbd>
        {/each}
        <span class="key-hints-description">{hint.does}</span>
      </span>
    {/each}
  {/if}
</svelte:element>
