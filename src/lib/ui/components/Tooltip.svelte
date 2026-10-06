<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createAttachmentKey } from 'svelte/attachments';
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import { followAnchor } from './anchor-tracking';
  import { hintPlacement, overlaySpacing } from './overlay-placement';
  import type { HintPlacement } from './overlay-placement';
  import {
    TOOLTIP_HIDE_GRACE_MS,
    TOOLTIP_SHOW_DELAY_MS,
    tooltipShown,
    tooltipStep,
  } from './tooltip-phase';
  import type { TooltipEvent, TooltipPhase } from './tooltip-phase';

  type TooltipTrigger = {
    readonly 'aria-describedby'?: string;
    readonly [attach: symbol]: Attachment<HTMLElement>;
  };

  type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'role' | 'popover'> & {
    text: string;
    trigger: Snippet<[TooltipTrigger]>;
    describeTrigger?: boolean;
  };

  let { text, trigger, describeTrigger = true, class: className, ...rest }: Props = $props();

  const uid = $props.id();
  const tooltipId = `${uid}-tooltip`;
  let hint = $state<HTMLSpanElement>();
  let anchor: HTMLElement | undefined;
  let phase: TooltipPhase = 'hidden';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let unfollow: (() => void) | undefined;
  let placement = $state<HintPlacement>();

  function place(): void {
    if (anchor === undefined || hint === undefined) return;
    const viewport = document.documentElement;
    placement = hintPlacement(
      anchor.getBoundingClientRect(),
      { width: viewport.clientWidth, height: viewport.clientHeight },
      { width: hint.offsetWidth, height: hint.offsetHeight },
      overlaySpacing(getComputedStyle(hint)),
    );
  }

  function clearTimer(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function startTimer(ms: number): void {
    clearTimer();
    timer = setTimeout(() => {
      timer = undefined;
      send('elapsed');
    }, ms);
  }

  function reveal(): void {
    clearTimer();
    if (hint === undefined) return;
    if (!hint.matches(':popover-open')) hint.showPopover();
    place();
    unfollow ??= followAnchor(place, hint);
  }

  function conceal(): void {
    clearTimer();
    unfollow?.();
    unfollow = undefined;
    if (hint?.matches(':popover-open') === true) hint.hidePopover();
  }

  function send(event: TooltipEvent): void {
    const next = tooltipStep(phase, event);
    phase = next.phase;
    if (next.effect === 'wait') startTimer(TOOLTIP_SHOW_DELAY_MS);
    else if (next.effect === 'grace') startTimer(TOOLTIP_HIDE_GRACE_MS);
    else if (next.effect === 'show') reveal();
    else if (next.effect === 'hide') conceal();
    else if (next.effect === 'cancel') clearTimer();
  }

  function keydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented || phase === 'hidden') return;
    if (tooltipShown(phase)) event.preventDefault();
    send('escape');
  }

  const enter = (): void => send('enter');
  const leave = (): void => send('leave');
  const focus = (): void => send('focus');
  const blur = (): void => send('blur');

  const attachKey = createAttachmentKey();

  function attachTrigger(element: HTMLElement): () => void {
    anchor = element;
    element.addEventListener('mouseenter', enter);
    element.addEventListener('mouseleave', leave);
    element.addEventListener('focusin', focus);
    element.addEventListener('focusout', blur);
    return () => {
      element.removeEventListener('mouseenter', enter);
      element.removeEventListener('mouseleave', leave);
      element.removeEventListener('focusin', focus);
      element.removeEventListener('focusout', blur);
      if (anchor === element) anchor = undefined;
    };
  }

  const triggerProps: TooltipTrigger = $derived(
    describeTrigger
      ? { 'aria-describedby': tooltipId, [attachKey]: attachTrigger }
      : { [attachKey]: attachTrigger },
  );

  const releaseOnDestroy: Attachment<HTMLSpanElement> = () => conceal;
</script>

<svelte:document onkeydown={keydown} />
<svelte:window onblur={blur} />

{@render trigger(triggerProps)}
<span
  {...rest}
  bind:this={hint}
  {@attach releaseOnDestroy}
  id={tooltipId}
  popover="hint"
  role="tooltip"
  class={['tooltip', className]}
  style:--tooltip-top={placement === undefined ? undefined : `${placement.top}px`}
  style:--tooltip-left={placement === undefined ? undefined : `${placement.left}px`}
  onmouseenter={enter}
  onmouseleave={leave}>{text}</span
>
