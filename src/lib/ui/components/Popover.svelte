<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createAttachmentKey } from 'svelte/attachments';
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import { followAnchor } from './anchor-tracking';
  import { inlineDirection, overlayPlacement, overlaySpacing } from './overlay-placement';
  import type { OverlayPlacement } from './overlay-placement';

  type PopoverTrigger = {
    readonly type: 'button';
    readonly popovertarget: string;
    readonly 'aria-haspopup': 'dialog';
    readonly [attach: symbol]: Attachment<HTMLElement>;
  };

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role' | 'popover'> & {
    label: string;
    trigger: Snippet<[PopoverTrigger]>;
    children: Snippet;
  };

  let { label, trigger, children, class: className, ...rest }: Props = $props();

  const uid = $props.id();
  let sheet = $state<HTMLDivElement>();
  let anchor: HTMLElement | undefined;
  let unfollow: (() => void) | undefined;
  let placement = $state<OverlayPlacement>();

  const triggerProps: PopoverTrigger = {
    type: 'button',
    popovertarget: `${uid}-popover`,
    'aria-haspopup': 'dialog',
    [createAttachmentKey()]: (element: HTMLElement) => {
      anchor = element;
      return () => {
        if (anchor === element) anchor = undefined;
      };
    },
  };

  function place(): void {
    if (anchor === undefined || sheet === undefined) return;
    const box = sheet.getBoundingClientRect();
    const style = getComputedStyle(sheet);
    const viewport = document.documentElement;
    placement = overlayPlacement(
      anchor.getBoundingClientRect(),
      { width: viewport.clientWidth, height: viewport.clientHeight },
      { width: box.width, height: box.height },
      { align: 'start', direction: inlineDirection(style.direction), width: 'content' },
      overlaySpacing(style),
    );
  }

  function startFollowing(): void {
    place();
    unfollow ??= followAnchor(place, sheet);
  }

  function stopFollowing(): void {
    unfollow?.();
    unfollow = undefined;
  }

  function toggled(event: ToggleEvent): void {
    if (event.newState === 'open') startFollowing();
    else stopFollowing();
  }

  function left(): void {
    if (unfollow !== undefined && sheet?.matches(':popover-open')) sheet.hidePopover();
  }

  const releaseOnDestroy: Attachment<HTMLDivElement> = () => stopFollowing;
</script>

<svelte:window onblur={left} />

{@render trigger(triggerProps)}
<div
  {...rest}
  bind:this={sheet}
  {@attach releaseOnDestroy}
  id="{uid}-popover"
  popover="auto"
  role="dialog"
  aria-label={label}
  class={['popover', className]}
  style:--popover-top={placement === undefined ? undefined : `${placement.top}px`}
  style:--popover-left={placement === undefined ? undefined : `${placement.left}px`}
  ontoggle={toggled}
>
  {@render children()}
</div>
