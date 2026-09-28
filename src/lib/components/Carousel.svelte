<script lang="ts" generics="T extends CarouselSlide">
  import type { Snippet } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import type { HTMLAttributes } from 'svelte/elements';
  import {
    CAROUSEL_REST,
    carouselGap,
    carouselNeighbours,
    carouselShift,
    carouselStep,
    holdsSide,
    screenSide,
    swipeRelease,
  } from './carousel';
  import type {
    CarouselDirection,
    CarouselInput,
    CarouselMotion,
    CarouselScene,
    CarouselSide,
    CarouselSlide,
  } from './carousel';

  type Press = { readonly id: number; readonly x: number; readonly t: number };

  type Props = Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'dir' | 'onpointerdown' | 'onpointermove' | 'onpointerup' | 'onpointercancel'
  > & {
    slides: readonly T[];
    slide: Snippet<[T]>;
    motion?: CarouselMotion;
    gap?: number | undefined;
    dir?: CarouselDirection;
    driven?: boolean;
    onsettled?: (towards: CarouselSide) => void;
  };

  let {
    slides,
    slide,
    motion = $bindable(CAROUSEL_REST),
    gap,
    dir = 'ltr',
    driven = false,
    onsettled,
    class: className,
    ...attributes
  }: Props = $props();

  const SETTLE_FALLBACK_MS = 400;

  const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

  let root = $state<HTMLDivElement | null>(null);
  let press: Press | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  function sceneGap(element: HTMLDivElement | null): number {
    if (gap !== undefined) return gap;
    return element === null ? 0 : carouselGap(getComputedStyle(element));
  }

  function scene(): CarouselScene {
    return {
      width: root?.getBoundingClientRect().width ?? 0,
      gap: sceneGap(root),
      direction: dir,
      neighbours: carouselNeighbours(slides),
    };
  }

  function stopSettleTimer(): void {
    if (settleTimer !== null) clearTimeout(settleTimer);
    settleTimer = null;
  }

  export function finish(): void {
    const settling = motion;
    if (settling.kind !== 'settle') return;

    stopSettleTimer();
    motion = CAROUSEL_REST;
    if (settling.towards !== null) onsettled?.(settling.towards);
  }

  export function rest(): void {
    stopSettleTimer();
    motion = CAROUSEL_REST;
  }

  export function drive(input: CarouselInput): boolean {
    const was = motion;
    const fed: CarouselInput =
      input.kind === 'follow' && reducedMotion.current ? { kind: 'follow', travel: 0 } : input;
    motion = carouselStep(was, fed, scene());

    const handed = was.kind === 'follow' && motion.kind === 'settle';
    if (handed) {
      stopSettleTimer();
      settleTimer = setTimeout(finish, SETTLE_FALLBACK_MS);
    }
    return handed;
  }

  function settled(event: TransitionEvent): void {
    if (event.target === event.currentTarget && event.propertyName === 'transform') finish();
  }

  function onpointerdown(event: PointerEvent): void {
    const element = root;
    if (element === null || press !== null || !event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    finish();
    press = { id: event.pointerId, x: event.clientX, t: event.timeStamp };
    element.setPointerCapture(event.pointerId);
  }

  function onpointermove(event: PointerEvent): void {
    const held = press;
    if (held === null || held.id !== event.pointerId) return;

    drive({ kind: 'follow', travel: event.clientX - held.x });
  }

  function onpointerup(event: PointerEvent): void {
    const held = press;
    if (held === null || held.id !== event.pointerId) return;

    press = null;
    const now = scene();
    const towards = swipeRelease(
      event.clientX - held.x,
      event.timeStamp - held.t,
      now.width,
      now.direction,
    );
    const handed = drive({ kind: 'release', towards });
    if (!handed && towards !== null && holdsSide(now.neighbours, towards)) onsettled?.(towards);
  }

  function onpointercancel(event: PointerEvent): void {
    const held = press;
    if (held === null || held.id !== event.pointerId) return;

    press = null;
    drive({ kind: 'release', towards: null });
  }

  $effect(() => stopSettleTimer);
</script>

<div
  {...attributes}
  class={['carousel', { 'carousel-swipeable': !driven }, className]}
  bind:this={root}
  onpointerdown={driven ? undefined : onpointerdown}
  onpointermove={driven ? undefined : onpointermove}
  onpointerup={driven ? undefined : onpointerup}
  onpointercancel={driven ? undefined : onpointercancel}
>
  {#each slides as item (item.key)}
    <div
      class={[
        'carousel-slot',
        { 'is-beside': item.beside !== 0, 'is-settling': motion.kind === 'settle' },
      ]}
      inert={item.beside !== 0}
      style:--carousel-beside={screenSide(item.beside, dir)}
      style:--carousel-shift="{carouselShift(motion)}px"
      style:--carousel-gap={gap === undefined ? undefined : `${gap}px`}
      ontransitionend={settled}
    >
      {@render slide(item)}
    </div>
  {/each}
</div>
