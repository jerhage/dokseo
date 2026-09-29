<script lang="ts">
  import type { Component } from 'svelte';
  import { match } from 'ts-pattern';
  import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
  import ArrowRight from '$lib/components/icons/ArrowRight.svelte';
  import ArrowUpDown from '$lib/components/icons/ArrowUpDown.svelte';
  import type { IconProps } from '$lib/components/icons/icon';
  import { swipeLine } from './swipe-lesson';
  import type { SwipeLesson } from './swipe-lesson';
  import './swipe-line.css';

  type Props = { readonly lesson: SwipeLesson };

  const { lesson }: Props = $props();

  const line = $derived(swipeLine(lesson));
  const Arrow = $derived(
    match(line.arrow)
      .with('left', (): Component<IconProps> => ArrowLeft)
      .with('right', (): Component<IconProps> => ArrowRight)
      .with('up-down', (): Component<IconProps> => ArrowUpDown)
      .exhaustive(),
  );
</script>

<span class="swipe-line row items-center justify-center gap-2 text-sm weight-medium">
  <Arrow class="swipe-line-arrow shrink-0" />
  <span>{line.text}</span>
</span>
