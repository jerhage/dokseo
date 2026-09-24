<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { STAT_TRENDS } from './classes';
  import type { StatTrend } from './classes';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    label: string;
    value: string;
    delta?: string | undefined;
    trend?: StatTrend;
  };

  let { label, value, delta, trend = 'flat', class: className, ...rest }: Props = $props();
</script>

<div {...rest} class={['stat', className]}>
  <span class="stat-label">{label}</span>
  <span class="stat-value">{value}</span>
  {#if delta !== undefined}
    <span class={['stat-delta', STAT_TRENDS[trend]]}>{delta}</span>
  {/if}
</div>
