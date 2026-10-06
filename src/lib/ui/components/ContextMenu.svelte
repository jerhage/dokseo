<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import { followAnchor } from './anchor-tracking';
  import { opensMenuByKey, pointerPlacement } from './context-menu';
  import type { PointerSpot } from './context-menu';
  import { provideMenu } from './menu';
  import {
    inlineDirection,
    menuInset,
    overlayPlacement,
    overlaySpacing,
  } from './overlay-placement';
  import type { OverlayPlacement } from './overlay-placement';
  import { landOn, menuMove } from './roving';
  import type { Move } from './roving';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    label: string;
    menu: Snippet;
    children: Snippet;
  };

  type Opening =
    | { readonly kind: 'pointer'; readonly spot: PointerSpot }
    | { readonly kind: 'element'; readonly element: Element };

  let { label, menu: items, children, class: className, ...rest }: Props = $props();

  let menu = $state<HTMLDivElement>();
  let open = $state(false);
  let placement = $state<OverlayPlacement>();
  let opening: Opening | undefined;
  let returnTo: HTMLElement | undefined;
  let unfollow: (() => void) | undefined;
  const inset = $derived(menuInset(placement));

  provideMenu({ close: () => close(true) });

  function menuItems(): HTMLElement[] {
    return [...(menu?.querySelectorAll('.dropdown-item') ?? [])].filter(
      (item) => item instanceof HTMLElement,
    );
  }

  function focusBy(move: Move): void {
    const all = menuItems();
    const current = all.findIndex((item) => item === document.activeElement);
    const enabled = all.map((item) => !item.matches(':disabled, [aria-disabled="true"]'));
    const target = landOn(move, current, enabled);
    if (target !== undefined) all[target]?.focus();
  }

  function place(): void {
    if (menu === undefined || opening === undefined) return;
    const viewport = document.documentElement;
    const room = { width: viewport.clientWidth, height: viewport.clientHeight };
    const size = { width: menu.offsetWidth, height: menu.offsetHeight };
    const style = getComputedStyle(menu);
    const spacing = overlaySpacing(style);
    const direction = inlineDirection(style.direction);
    placement =
      opening.kind === 'pointer'
        ? pointerPlacement(opening.spot, room, size, spacing.edge, direction)
        : overlayPlacement(
            opening.element.getBoundingClientRect(),
            room,
            size,
            { align: 'start', direction, width: 'content' },
            spacing,
          );
  }

  function show(from: Opening): void {
    if (menu === undefined) return;
    opening = from;
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    open = true;
    if (!menu.matches(':popover-open')) menu.showPopover();
    place();
    unfollow ??= followAnchor(place);
  }

  function dismiss(): void {
    open = false;
    opening = undefined;
    unfollow?.();
    unfollow = undefined;
    if (menu?.matches(':popover-open') === true) menu.hidePopover();
  }

  function close(returnFocus: boolean): void {
    const target = returnTo;
    dismiss();
    returnTo = undefined;
    if (returnFocus) target?.focus();
  }

  function inMenu(target: EventTarget | null): boolean {
    return target instanceof Node && menu?.contains(target) === true;
  }

  function contextmenu(event: MouseEvent): void {
    event.preventDefault();
    if (open || inMenu(event.target)) return;
    show({ kind: 'pointer', spot: { x: event.clientX, y: event.clientY } });
    menu?.focus();
  }

  async function keydown(event: KeyboardEvent): Promise<void> {
    if (!inMenu(event.target)) {
      if (!opensMenuByKey(event.key, event.shiftKey) || !(event.target instanceof Element)) return;
      event.preventDefault();
      if (open) return;
      show({ kind: 'element', element: event.target });
      await tick();
      focusBy('first');
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    const move = menuMove(event.key);
    if (move === undefined) return;
    event.preventDefault();
    focusBy(move);
  }

  function focusout(event: FocusEvent): void {
    if (!open || !inMenu(event.target)) return;
    const next = event.relatedTarget;
    if (next instanceof Node && !inMenu(next)) dismiss();
  }

  function outside(event: PointerEvent): void {
    if (open && !inMenu(event.target)) dismiss();
  }

  function left(): void {
    if (open) dismiss();
  }

  const releaseOnDestroy: Attachment<HTMLDivElement> = () => () => {
    unfollow?.();
    unfollow = undefined;
  };
</script>

<svelte:document onpointerdown={outside} />
<svelte:window onblur={left} />

<div
  {...rest}
  class={['context-menu', className]}
  oncontextmenu={contextmenu}
  onkeydown={keydown}
  onfocusout={focusout}
  role="presentation"
>
  {@render children()}
  <div
    bind:this={menu}
    {@attach releaseOnDestroy}
    role="menu"
    aria-label={label}
    tabindex="-1"
    popover="manual"
    class="dropdown-menu"
    style:--menu-top={inset.top}
    style:--menu-left={inset.left}
    style:--menu-max-width={inset.maxWidth}
  >
    {@render items()}
  </div>
</div>
