<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createAttachmentKey } from 'svelte/attachments';
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import { followAnchor } from './anchor-tracking';
  import { inlineDirection, overlayPlacement, overlaySpacing } from './overlay-placement';
  import type { OverlayPlacement } from './overlay-placement';

  type PopoverTrigger = {
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
  let open = $state(false);
  let placement = $state<OverlayPlacement>();

  const triggerProps: PopoverTrigger = {
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

  function toggled(event: ToggleEvent): void {
    open = event.newState === 'open';
    if (open) place();
  }

  $effect(() => {
    if (!open) return;
    return followAnchor(place);
  });
</script>

{@render trigger(triggerProps)}
<div
  {...rest}
  bind:this={sheet}
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
