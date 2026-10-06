<script lang="ts">
  import type { Component, ComponentProps, Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import Button from './Button.svelte';
  import { iconButtonTip } from './icon-button';
  import type { IconButtonTooltip } from './icon-button';
  import type { IconProps } from './icons/icon';
  import Tooltip from './Tooltip.svelte';

  type Named = 'children' | 'title' | 'aria-label' | 'aria-labelledby' | 'ref';

  type ButtonProps<Given = ComponentProps<typeof Button>> = Given extends unknown
    ? Omit<Given, Named>
    : never;

  type Face =
    | { icon: Component<IconProps>; children?: undefined }
    | { icon?: undefined; children: Snippet };

  type HintTrigger = {
    readonly 'aria-describedby'?: string;
    readonly [attach: symbol]: Attachment<HTMLElement>;
  };

  type Props = ButtonProps &
    Face & {
      label: string;
      tooltip?: IconButtonTooltip;
      hint?: boolean;
      ref?: HTMLButtonElement | HTMLAnchorElement | null | undefined;
    };

  let {
    label,
    tooltip,
    hint = false,
    icon: Icon,
    children,
    square = true,
    ref = $bindable(),
    ...rest
  }: Props = $props();

  let asButton = $state<HTMLButtonElement | null>();
  let asLink = $state<HTMLAnchorElement | null>();

  const tip = $derived(iconButtonTip(label, tooltip, hint));
  const title = $derived(tip.kind === 'title' ? tip.text : undefined);
</script>

{#snippet face()}
  {#if Icon !== undefined}
    <Icon class="btn-icon" />
  {:else}
    {@render children?.()}
  {/if}
  <span class="visually-hidden">{label}</span>
{/snippet}

{#snippet control(trigger: HintTrigger)}
  {#if rest.href === undefined}
    <Button
      {...rest}
      {...trigger}
      {square}
      {title}
      bind:ref={() => asButton, (element) => (ref = asButton = element)}
    >
      {@render face()}
    </Button>
  {:else}
    <Button
      {...rest}
      {...trigger}
      {square}
      {title}
      bind:ref={() => asLink, (element) => (ref = asLink = element)}
    >
      {@render face()}
    </Button>
  {/if}
{/snippet}

{#if tip.kind === 'hint'}
  <Tooltip text={tip.text} describeTrigger={tip.describes}>
    {#snippet trigger(props)}
      {@render control(props)}
    {/snippet}
  </Tooltip>
{:else}
  {@render control({})}
{/if}
