<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { announcementRole } from './announcement';
  import { ALERT_VARIANTS } from './classes';
  import type { StatusVariant } from './classes';
  import X from './icons/X.svelte';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
    variant?: StatusVariant;
    title?: string | undefined;
    actions?: Snippet;
    ondismiss?: () => void;
    dismissLabel?: string;
  };

  let {
    variant = 'info',
    title,
    actions,
    ondismiss,
    dismissLabel = 'Dismiss',
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<div
  role={announcementRole(variant)}
  {...rest}
  class={['alert', ALERT_VARIANTS[variant], className]}
>
  <span class="alert-icon" aria-hidden="true"></span>
  <div class="alert-content">
    {#if title !== undefined}
      <p class="alert-title">{title}</p>
    {/if}
    {#if children}
      <div class="alert-description">{@render children()}</div>
    {/if}
    {#if actions}
      <div class="alert-actions">{@render actions()}</div>
    {/if}
  </div>
  {#if ondismiss !== undefined}
    <button type="button" class="alert-close" aria-label={dismissLabel} onclick={ondismiss}>
      <X class="close-icon" />
    </button>
  {/if}
</div>
