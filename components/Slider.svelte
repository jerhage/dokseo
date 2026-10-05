<script lang="ts">
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';
  import type { SliderDirection } from './slider';

  type Props = Omit<
    HTMLInputAttributes,
    | 'type'
    | 'value'
    | 'min'
    | 'max'
    | 'step'
    | 'dir'
    | 'children'
    | 'class'
    | 'aria-label'
    | 'aria-valuetext'
  > & {
    label: string;
    value: number;
    max: number;
    min?: number;
    step?: number;
    valuetext?: string;
    dir?: SliderDirection;
    ticks?: readonly number[];
    class?: ClassValue;
  };

  const NO_TICKS: readonly number[] = [];

  let {
    label,
    value,
    max,
    min = 0,
    step = 1,
    valuetext,
    dir = 'ltr',
    ticks = NO_TICKS,
    class: className,
    ...rest
  }: Props = $props();
</script>

{#snippet control(classes: ClassValue)}
  <input
    {...rest}
    class={classes}
    type="range"
    {min}
    {max}
    {step}
    {value}
    {dir}
    aria-label={label}
    aria-valuetext={valuetext}
  />
{/snippet}

{#if ticks.length === 0}
  {@render control(['slider', className])}
{:else}
  <div class={['slider-wrapper', className]}>
    {@render control('slider')}
    {#each ticks as offset, slot (slot)}
      <span class="slider-tick" aria-hidden="true" style:--slider-tick-at="{offset}%"></span>
    {/each}
  </div>
{/if}
