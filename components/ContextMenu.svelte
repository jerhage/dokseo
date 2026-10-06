<script lang="ts" generics="T">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import { followAnchor } from './anchor-tracking';
  import { opensMenuByKey, pointerPlacement } from './context-menu';
  import type { PointerSpot } from './context-menu';
  import type { AreaListener, ContextMenuAreas } from './context-menu-areas';
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

  type Wrapped = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    label: string;
    menu: Snippet;
    children: Snippet;
    areas?: undefined;
    current?: undefined;
  };

  type Attached = {
    areas: ContextMenuAreas<T>;
    label: (value: T) => string;
    menu: Snippet<[T]>;
    current?: T;
    children?: undefined;
  };

  type Props = Wrapped | Attached;

  type Opening =
    | { readonly kind: 'pointer'; readonly spot: PointerSpot }
    | { readonly kind: 'element'; readonly element: Element };

  type Form =
    | {
        readonly kind: 'wrapped';
        readonly label: string;
        readonly items: Snippet;
        readonly children: Snippet;
        readonly attributes: Omit<HTMLAttributes<HTMLDivElement>, 'children'>;
      }
    | {
        readonly kind: 'attached';
        readonly areas: ContextMenuAreas<T>;
        readonly label: (value: T) => string;
        readonly items: Snippet<[T]>;
      };

  let { current = $bindable(), ...props }: Props = $props();

  const form: Form = $derived.by(() => {
    if (props.areas !== undefined) {
      return { kind: 'attached', areas: props.areas, label: props.label, items: props.menu };
    }
    const { label, menu: items, children, areas: _areas, ...attributes } = props;
    return { kind: 'wrapped', label, items, children, attributes };
  });

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
    const focused = all.findIndex((item) => item === document.activeElement);
    const enabled = all.map((item) => !item.matches(':disabled, [aria-disabled="true"]'));
    const target = landOn(move, focused, enabled);
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
    unfollow ??= followAnchor(place, menu);
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
    openByPointer(event);
  }

  function keyOpening(event: KeyboardEvent): Opening | undefined {
    if (!opensMenuByKey(event.key, event.shiftKey) || !(event.target instanceof Element)) {
      return undefined;
    }
    event.preventDefault();
    return open ? undefined : { kind: 'element', element: event.target };
  }

  async function openByKey(from: Opening): Promise<void> {
    show(from);
    await tick();
    focusBy('first');
  }

  function openByPointer(event: MouseEvent): void {
    show({ kind: 'pointer', spot: { x: event.clientX, y: event.clientY } });
    menu?.focus();
  }

  async function keydown(event: KeyboardEvent): Promise<void> {
    if (inMenu(event.target)) return;
    const from = keyOpening(event);
    if (from !== undefined) await openByKey(from);
  }

  function menuKeydown(event: KeyboardEvent): void {
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

  function menuContextmenu(event: MouseEvent): void {
    event.preventDefault();
  }

  const areaListener: AreaListener<T> = {
    contextmenu: async (event, value) => {
      event.preventDefault();
      if (open || inMenu(event.target)) return;
      current = value;
      await tick();
      openByPointer(event);
    },
    keydown: async (event, value) => {
      if (inMenu(event.target)) return;
      const from = keyOpening(event);
      if (from === undefined) return;
      current = value;
      await tick();
      await openByKey(from);
    },
  };

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

  const listenToAreas: Attachment<HTMLDivElement> = () =>
    form.kind === 'attached' ? form.areas.listen(areaListener) : undefined;
</script>

<svelte:document onpointerdown={outside} />
<svelte:window onblur={left} />

{#snippet panel(label: string | undefined, contents: Snippet)}
  <div
    bind:this={menu}
    {@attach releaseOnDestroy}
    {@attach listenToAreas}
    role="menu"
    aria-label={label}
    tabindex="-1"
    popover="manual"
    class="dropdown-menu"
    style:--menu-top={inset.top}
    style:--menu-left={inset.left}
    style:--menu-max-width={inset.maxWidth}
    onkeydown={menuKeydown}
    onfocusout={focusout}
    oncontextmenu={menuContextmenu}
  >
    {@render contents()}
  </div>
{/snippet}

{#snippet attachedItems()}
  {#if form.kind === 'attached' && current !== undefined}
    {@render form.items(current)}
  {/if}
{/snippet}

{#if form.kind === 'wrapped'}
  <div
    {...form.attributes}
    class={['context-menu', form.attributes.class]}
    oncontextmenu={contextmenu}
    onkeydown={keydown}
    role="presentation"
  >
    {@render form.children()}
    {@render panel(form.label, form.items)}
  </div>
{:else}
  {@render panel(current === undefined ? undefined : form.label(current), attachedItems)}
{/if}
