<script lang="ts">
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import { BUTTON_SIZES, BUTTON_VARIANTS } from './classes';
  import type { ButtonVariant, ControlSize } from './classes';

  type Looks = {
    variant?: ButtonVariant;
    size?: ControlSize;
    square?: boolean;
    block?: boolean;
    pill?: boolean;
    loading?: boolean;
    active?: boolean;
  };

  type ButtonProps = Looks &
    HTMLButtonAttributes & {
      href?: undefined;
      ref?: HTMLButtonElement | undefined;
    };

  type LinkProps = Looks &
    HTMLAnchorAttributes & {
      href: string;
      ref?: HTMLAnchorElement | undefined;
    };

  type Props = ButtonProps | LinkProps;

  let {
    variant = 'default',
    size = 'md',
    square = false,
    block = false,
    pill = false,
    loading = false,
    active = false,
    ref = $bindable(),
    class: className,
    children,
    ...rest
  }: Props = $props();

  const classes = $derived([
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
  ]);
</script>

{#if rest.href === undefined}
  <button
    {...rest}
    type={rest.type ?? 'button'}
    bind:this={ref}
    aria-busy={loading || undefined}
    class={classes}
  >
    {@render children?.()}
  </button>
{:else}
  <a {...rest} bind:this={ref} aria-busy={loading || undefined} class={classes}>
    {@render children?.()}
  </a>
{/if}
