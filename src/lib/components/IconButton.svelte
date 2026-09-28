<script lang="ts">
  import type { Component, ComponentProps, Snippet } from 'svelte';
  import Button from './Button.svelte';
  import { iconButtonTitle } from './icon-button';
  import type { IconButtonTooltip } from './icon-button';
  import type { IconProps } from './icons/icon';

  type Named = 'children' | 'title' | 'aria-label' | 'aria-labelledby' | 'ref';

  type ButtonProps<Given = ComponentProps<typeof Button>> = Given extends unknown
    ? Omit<Given, Named>
    : never;

  type Face =
    | { icon: Component<IconProps>; children?: undefined }
    | { icon?: undefined; children: Snippet };

  type Props = ButtonProps &
    Face & {
      label: string;
      tooltip?: IconButtonTooltip;
      ref?: HTMLButtonElement | HTMLAnchorElement | null | undefined;
    };

  let {
    label,
    tooltip,
    icon: Icon,
    children,
    square = true,
    ref = $bindable(),
    ...rest
  }: Props = $props();

  let asButton = $state<HTMLButtonElement | null>();
  let asLink = $state<HTMLAnchorElement | null>();

  const title = $derived(iconButtonTitle(label, tooltip));
</script>

{#snippet face()}
  {#if Icon !== undefined}
    <Icon class="btn-icon" />
  {:else}
    {@render children?.()}
  {/if}
  <span class="visually-hidden">{label}</span>
{/snippet}

{#if rest.href === undefined}
  <Button
    {...rest}
    {square}
    {title}
    bind:ref={() => asButton, (element) => (ref = asButton = element)}
  >
    {@render face()}
  </Button>
{:else}
  <Button {...rest} {square} {title} bind:ref={() => asLink, (element) => (ref = asLink = element)}>
    {@render face()}
  </Button>
{/if}
