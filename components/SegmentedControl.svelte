<script lang="ts" generics="V extends string">
  import type { HTMLAttributes } from 'svelte/elements';
  import Button from './Button.svelte';
  import { SEGMENTED_VARIANTS, groupRole, segmentLook } from './segmented-control';
  import type { SegmentOption, SegmentedVariant } from './segmented-control';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role' | 'aria-label'> & {
    options: readonly SegmentOption<V>[];
    value?: V | undefined;
    onvaluechange?: (value: V) => void;
    label?: string;
    variant?: SegmentedVariant;
  };

  let {
    options,
    value = $bindable(),
    onvaluechange,
    label,
    'aria-labelledby': labelledBy,
    variant = 'default',
    class: className,
    ...rest
  }: Props = $props();

  function press(chosen: V): void {
    value = chosen;
    onvaluechange?.(chosen);
  }
</script>

<div
  {...rest}
  role={groupRole(label, labelledBy)}
  aria-label={label}
  aria-labelledby={labelledBy}
  class={['segmented', SEGMENTED_VARIANTS[variant], className]}
>
  {#each options as option (option.value)}
    {@const pressed = option.value === value}
    {@const look = segmentLook(variant, pressed)}
    {#if look.kind === 'chip'}
      <button
        type="button"
        aria-pressed={pressed}
        disabled={option.disabled}
        class={['segmented-item', { 'is-active': pressed }]}
        onclick={() => press(option.value)}>{option.label}</button
      >
    {:else}
      <Button
        size="sm"
        variant={look.variant}
        active={pressed}
        aria-pressed={pressed}
        disabled={option.disabled}
        onclick={() => press(option.value)}
      >
        {option.label}
      </Button>
    {/if}
  {/each}
</div>
