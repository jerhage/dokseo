<script lang="ts">
  import { untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import ChevronLeft from './icons/ChevronLeft.svelte';
  import ChevronRight from './icons/ChevronRight.svelte';
  import IconButton from './IconButton.svelte';
  import { stepCounter } from './step-through';
  import { createStepThrough } from './step-through.svelte';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children' | 'aria-label'> & {
    label: string;
    captions: readonly string[];
    initial?: number;
    previousLabel?: string;
    nextLabel?: string;
    children: Snippet<[number]>;
  };

  let {
    label,
    captions,
    initial = 0,
    previousLabel = 'Previous step',
    nextLabel = 'Next step',
    class: className,
    children,
    ...rest
  }: Props = $props();

  const steps = createStepThrough({
    count: () => captions.length,
    initial: untrack(() => initial),
  });
</script>

<section {...rest} class={['step-through', className]} aria-label={label}>
  <div class="step-through-stage">
    {@render children(steps.index)}
  </div>
  <p class="step-through-caption" aria-live="polite">{captions[steps.index] ?? ''}</p>
  <div class="step-through-controls">
    <IconButton
      icon={ChevronLeft}
      label={previousLabel}
      variant="ghost"
      size="sm"
      disabled={steps.atFirst}
      onclick={steps.previous}
    />
    <span class="step-through-counter">{stepCounter(steps.index, captions.length)}</span>
    <IconButton
      icon={ChevronRight}
      label={nextLabel}
      variant="ghost"
      size="sm"
      disabled={steps.atLast}
      onclick={steps.next}
    />
  </div>
</section>
