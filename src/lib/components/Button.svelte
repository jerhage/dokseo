<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { BUTTON_SIZES, BUTTON_VARIANTS } from './classes';
  import type { ButtonVariant, ControlSize } from './classes';

  type Props = HTMLButtonAttributes & {
    variant?: ButtonVariant;
    size?: ControlSize;
    square?: boolean;
    block?: boolean;
    pill?: boolean;
    loading?: boolean;
    active?: boolean;
    ref?: HTMLButtonElement | undefined;
  };

  let {
    variant = 'default',
    size = 'md',
    square = false,
    block = false,
    pill = false,
    loading = false,
    active = false,
    type = 'button',
    ref = $bindable(),
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<button
  {...rest}
  bind:this={ref}
  {type}
  aria-busy={loading || undefined}
  class={[
    'btn',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    {
      'btn-square': square,
      'btn-block': block,
      'btn-pill': pill,
      'btn-loading': loading,
      'is-active': active,
    },
    className,
  ]}
>
  {@render children?.()}
</button>
