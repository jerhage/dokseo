<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { BUTTON_SIZES, BUTTON_VARIANTS, MENU_ALIGNS } from './classes';
  import type { ButtonVariant, ControlSize, MenuAlign } from './classes';
  import { menuOpening, provideMenu } from './menu';
  import { menuInset, menuPlacement } from './menu-placement';
  import type { MenuPlacement } from './menu-placement';
  import { landOn, menuMove } from './roving';
  import type { Move } from './roving';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    trigger: Snippet;
    children: Snippet;
    open?: boolean;
    variant?: ButtonVariant;
    size?: ControlSize;
    align?: MenuAlign;
  };

  let {
    trigger,
    children,
    open = $bindable(false),
    variant = 'default',
    size = 'md',
    align = 'start',
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  let root = $state<HTMLDivElement>();
  let button = $state<HTMLButtonElement>();
  let menu = $state<HTMLDivElement>();
  let placement = $state<MenuPlacement>();
  const inset = $derived(menuInset(placement));

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

  async function show(move: Move | undefined): Promise<void> {
    open = true;
    await tick();
    if (move !== undefined) focusBy(move);
  }

  function close(returnFocus: boolean): void {
    open = false;
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
    if (next instanceof Node && root !== undefined && !root.contains(next)) open = false;
  }

  function place(): void {
    if (button === undefined || menu === undefined) return;
    const viewport = document.documentElement;
    placement = menuPlacement(
      button.getBoundingClientRect(),
      { width: viewport.clientWidth, height: viewport.clientHeight },
      menu.offsetHeight,
    );
  }

  $effect(() => {
    const shown = menu;
    if (!open || shown === undefined) return;
    shown.showPopover();
    place();
    window.addEventListener('scroll', place, { capture: true, passive: true });
    window.addEventListener('resize', place, { passive: true });
    return () => {
      window.removeEventListener('scroll', place, { capture: true });
      window.removeEventListener('resize', place);
      if (shown.matches(':popover-open')) shown.hidePopover();
    };
  });

  $effect(() => {
    if (!open) return;
    const outside = (event: PointerEvent): void => {
      if (event.target instanceof Node && root?.contains(event.target)) return;
      open = false;
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  });
</script>

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
    class={['btn', 'dropdown-trigger', BUTTON_VARIANTS[variant], BUTTON_SIZES[size]]}
    onclick={toggle}
  >
    {@render trigger()}
  </button>
  <div
    bind:this={menu}
    id="{uid}-menu"
    role="menu"
    aria-labelledby="{uid}-trigger"
    popover="manual"
    class={['dropdown-menu', MENU_ALIGNS[align]]}
    style:--menu-top={inset.top}
    style:--menu-bottom={inset.bottom}
    style:--menu-left={inset.left}
    style:--menu-right={inset.right}
    style:--menu-anchor-width={inset.anchorWidth}
  >
    {@render children()}
  </div>
</div>
