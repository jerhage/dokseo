<script lang="ts">
  import { tick } from 'svelte';
  import type { Component, Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import { followAnchor } from './anchor-tracking';
  import { BUTTON_SIZES, BUTTON_VARIANTS } from './classes';
  import type { ButtonVariant, ControlSize, MenuAlign } from './classes';
  import { iconButtonTitle } from './icon-button';
  import type { IconButtonTooltip } from './icon-button';
  import ChevronDown from './icons/ChevronDown.svelte';
  import type { IconProps } from './icons/icon';
  import { menuOpening, provideMenu } from './menu';
  import {
    inlineDirection,
    menuInset,
    overlayPlacement,
    overlaySpacing,
  } from './overlay-placement';
  import type { OverlayPlacement } from './overlay-placement';
  import { landOn, menuMove } from './roving';
  import type { Move } from './roving';

  type Face =
    | { trigger: Snippet; icon?: undefined; label?: undefined; tooltip?: undefined }
    | {
        trigger?: undefined;
        icon: Component<IconProps>;
        label: string;
        tooltip?: IconButtonTooltip;
      };

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
    Face & {
      children: Snippet;
      variant?: ButtonVariant;
      size?: ControlSize;
      align?: MenuAlign;
      square?: boolean;
      chevron?: boolean;
    };

  let {
    trigger,
    icon: Icon,
    label,
    tooltip,
    children,
    variant = 'default',
    size = 'md',
    align = 'start',
    square = false,
    chevron = true,
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  let open = $state(false);
  let root = $state<HTMLDivElement>();
  let button = $state<HTMLButtonElement>();
  let menu = $state<HTMLDivElement>();
  let placement = $state<OverlayPlacement>();
  const inset = $derived(menuInset(placement));
  const title = $derived(label === undefined ? undefined : iconButtonTitle(label, tooltip));

  provideMenu({ close: () => close(true) });

  function items(): HTMLElement[] {
    return [...(menu?.querySelectorAll('.dropdown-item') ?? [])].filter(
      (item) => item instanceof HTMLElement,
    );
  }

  function focusBy(move: Move): void {
    const all = items();
    const active = document.activeElement;
    const current = all.findIndex((item) => item === active);
    const enabled = all.map((item) => !item.matches(':disabled, [aria-disabled="true"]'));
    const target = landOn(move, current, enabled);
    if (target !== undefined) all[target]?.focus();
  }

  let unfollow: (() => void) | undefined;

  function reveal(): void {
    if (unfollow !== undefined || menu === undefined) return;
    menu.showPopover();
    place();
    unfollow = followAnchor(place);
  }

  function conceal(): void {
    if (unfollow === undefined) return;
    unfollow();
    unfollow = undefined;
    if (menu?.matches(':popover-open')) menu.hidePopover();
  }

  function dismiss(): void {
    open = false;
    conceal();
  }

  async function show(move: Move | undefined): Promise<void> {
    open = true;
    reveal();
    await tick();
    if (move !== undefined) focusBy(move);
  }

  function close(returnFocus: boolean): void {
    dismiss();
    if (returnFocus) button?.focus();
  }

  function toggle(event: MouseEvent): void {
    if (open) close(false);
    else void show(event.detail === 0 ? 'first' : undefined);
  }

  function keydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
      return;
    }
    const move = open ? menuMove(event.key) : menuOpening(event.key);
    if (move === undefined) return;
    event.preventDefault();
    if (open) focusBy(move);
    else void show(move);
  }

  function focusout(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && root !== undefined && !root.contains(next)) dismiss();
  }

  function place(): void {
    if (button === undefined || menu === undefined) return;
    const viewport = document.documentElement;
    const style = getComputedStyle(menu);
    placement = overlayPlacement(
      button.getBoundingClientRect(),
      { width: viewport.clientWidth, height: viewport.clientHeight },
      { width: menu.offsetWidth, height: menu.offsetHeight },
      { align, direction: inlineDirection(style.direction), width: 'at-least-anchor' },
      overlaySpacing(style),
    );
  }

  function outside(event: PointerEvent): void {
    if (!open) return;
    if (event.target instanceof Node && root?.contains(event.target)) return;
    dismiss();
  }

  function left(): void {
    if (open) dismiss();
  }

  const releaseOnDestroy: Attachment<HTMLDivElement> = () => conceal;
</script>

<svelte:document onpointerdown={outside} />
<svelte:window onblur={left} />

<div
  {...rest}
  bind:this={root}
  class={['dropdown', { 'is-open': open }, className]}
  onkeydown={keydown}
  onfocusout={focusout}
  role="presentation"
>
  <button
    bind:this={button}
    type="button"
    id="{uid}-trigger"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-controls="{uid}-menu"
    {title}
    class={[
      'btn',
      'dropdown-trigger',
      BUTTON_VARIANTS[variant],
      BUTTON_SIZES[size],
      { 'btn-square': square },
    ]}
    onclick={toggle}
  >
    {#if Icon !== undefined}
      <Icon class="btn-icon" />
      <span class="visually-hidden">{label}</span>
    {:else}
      {@render trigger?.()}
    {/if}
    {#if chevron}
      <ChevronDown class="dropdown-icon" />
    {/if}
  </button>
  <div
    bind:this={menu}
    {@attach releaseOnDestroy}
    id="{uid}-menu"
    role="menu"
    aria-labelledby="{uid}-trigger"
    popover="manual"
    class="dropdown-menu"
    style:--menu-top={inset.top}
    style:--menu-left={inset.left}
    style:--menu-anchor-width={inset.anchorWidth}
    style:--menu-max-width={inset.maxWidth}
  >
    {@render children()}
  </div>
</div>
