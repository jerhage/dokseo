<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { EMPTY_STATE_VARIANTS } from './empty-state';
  import type { EmptyStateVariant } from './empty-state';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    message: string;
    variant?: EmptyStateVariant;
    live?: boolean;
    action?: Snippet;
  };

  let {
    message,
    variant = 'inline',
    live = false,
    action,
    class: className,
    ...rest
  }: Props = $props();
</script>

<div {...rest} class={['empty-state', EMPTY_STATE_VARIANTS[variant], className]}>
  <p class="empty-state-message" aria-live={live ? 'polite' : undefined}>{message}</p>
  {@render action?.()}
</div>
