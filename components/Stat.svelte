<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { STAT_SIZES, STAT_TRENDS } from './classes';
  import type { StatSize, StatTrend } from './classes';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    label: string;
    value: string;
    delta?: string | undefined;
    trend?: StatTrend;
    size?: StatSize;
    listed?: boolean;
  };

  let {
    label,
    value,
    delta,
    trend = 'flat',
    size = 'md',
    listed = false,
    class: className,
    ...rest
  }: Props = $props();
</script>

<div {...rest} class={['stat', STAT_SIZES[size], className]}>
  <svelte:element this={listed ? 'dt' : 'span'} class="stat-label eyebrow">{label}</svelte:element>
  <svelte:element this={listed ? 'dd' : 'span'} class="stat-value">{value}</svelte:element>
  {#if delta !== undefined}
    <svelte:element this={listed ? 'dd' : 'span'} class={['stat-delta', STAT_TRENDS[trend]]}
      >{delta}</svelte:element
    >
  {/if}
</div>
