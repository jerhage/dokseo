<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { BADGE_VARIANTS } from './classes';
  import type { BadgeVariant } from './classes';

  type Props = HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
    dot?: boolean;
  };

  let { variant = 'neutral', dot = false, class: className, children, ...rest }: Props = $props();
</script>

<span {...rest} class={['badge', BADGE_VARIANTS[variant], { 'badge-dot': dot }, className]}>
  {@render children?.()}
</span>
