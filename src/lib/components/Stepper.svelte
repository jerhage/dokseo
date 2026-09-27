<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { match } from 'ts-pattern';
  import Badge from './Badge.svelte';
  import IconButton from './IconButton.svelte';
  import ChevronDown from './icons/ChevronDown.svelte';
  import ChevronLeft from './icons/ChevronLeft.svelte';
  import ChevronRight from './icons/ChevronRight.svelte';
  import ChevronUp from './icons/ChevronUp.svelte';
  import type { IconProps } from './icons/icon';
  import { stepFace, stepperArrows } from './stepper';
  import type {
    StepFace,
    StepperArrow,
    StepperAxis,
    StepperEnds,
    StepperSteps,
    StepperTally,
  } from './stepper';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    steps: StepperSteps | null;
    axis?: StepperAxis;
    ends?: StepperEnds;
    tally?: StepperTally;
    spaced?: boolean;
    previousLabel?: string;
    nextLabel?: string;
    onfollow?: (event: MouseEvent, href: string) => void;
    children?: Snippet;
  };

  let {
    steps,
    axis = 'inline',
    ends = 'disabled',
    tally = 'badge',
    spaced = false,
    previousLabel = 'Previous',
    nextLabel = 'Next',
    onfollow,
    children,
    class: className,
    ...rest
  }: Props = $props();

  const arrows = $derived(stepperArrows(axis));
  const count = $derived(steps?.count ?? null);

  function arrowIcon(arrow: StepperArrow): Component<IconProps> {
    return match(arrow)
      .with('left', () => ChevronLeft)
      .with('right', () => ChevronRight)
      .with('up', () => ChevronUp)
      .with('down', () => ChevronDown)
      .exhaustive();
  }
</script>

{#snippet arrow(face: StepFace, pointing: StepperArrow, label: string)}
  {#if face.kind === 'link'}
    <IconButton
      variant="ghost"
      size="sm"
      href={face.href}
      icon={arrowIcon(pointing)}
      {label}
      onclick={(event) => onfollow?.(event, face.href)}
    />
  {:else if face.kind === 'action'}
    <IconButton
      variant="ghost"
      size="sm"
      icon={arrowIcon(pointing)}
      {label}
      onclick={() => face.run()}
    />
  {:else if face.kind === 'disabled'}
    <IconButton variant="ghost" size="sm" icon={arrowIcon(pointing)} {label} disabled />
  {/if}
{/snippet}

<div {...rest} class={['row items-center', className]}>
  {#if count !== null && tally === 'badge'}
    <Badge variant="brand" class="shrink-0">{count}</Badge>
  {/if}
  {@render children?.()}
  {#if steps !== null}
    <span class={['row items-center shrink-0', spaced ? 'gap-1' : 'gap-0']}>
      {@render arrow(stepFace(steps.previous, ends), arrows.previous, previousLabel)}
      {@render arrow(stepFace(steps.next, ends), arrows.next, nextLabel)}
    </span>
  {/if}
</div>
{#if count !== null && tally === 'status'}
  <p class="m-0 text-xs text-muted mono" role="status">{count}</p>
{/if}
