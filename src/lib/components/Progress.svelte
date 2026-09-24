<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { PROGRESS_SIZES, PROGRESS_VARIANTS } from './classes';
  import type { ControlSize, ProgressVariant } from './classes';
  import { progressPercent } from './progress';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    label: string;
    value?: number;
    max?: number;
    variant?: ProgressVariant;
    size?: ControlSize;
  };

  let {
    label,
    value,
    max = 100,
    variant = 'primary',
    size = 'md',
    class: className,
    ...rest
  }: Props = $props();

  const percent = $derived(value === undefined ? undefined : progressPercent(value, max));
</script>

<div
  {...rest}
  role="progressbar"
  aria-label={label}
  aria-valuemin={value === undefined ? undefined : 0}
  aria-valuemax={value === undefined ? undefined : max}
  aria-valuenow={value}
  style:--progress={percent === undefined ? undefined : `${percent}%`}
  class={[
    'progress-track',
    PROGRESS_VARIANTS[variant],
    PROGRESS_SIZES[size],
    { 'progress-indeterminate': value === undefined },
    className,
  ]}
>
  <div class="progress-fill"></div>
</div>
