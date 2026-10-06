<script lang="ts">
  import { match } from 'ts-pattern';
  import { tick, untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { HTMLDialogAttributes } from 'svelte/elements';
  import { animationsSettled } from './animations';
  import { DRAWER_SIDES } from './classes';
  import type { DrawerSide } from './classes';
  import { tabStops, wrappedStop } from './focus-wrap';
  import X from './icons/X.svelte';
  import { modalStep } from './modal-phase';
  import type { ModalEvent, ModalPhase } from './modal-phase';
  import { showsScrollbar } from './scrollbar';
  import { findToaster } from './toast-context';
  import ToastRegion from './ToastRegion.svelte';

  type Props = Omit<HTMLDialogAttributes, 'title' | 'open'> & {
    title: string;
    open?: boolean;
    side?: DrawerSide;
    closeButton?: boolean;
    closeLabel?: string;
    footer?: Snippet<[() => void]>;
    wrapFocus?: boolean;
  };

  let {
    open = $bindable(false),
    title,
    side = 'end',
    closeButton = true,
    closeLabel = 'Close',
    footer,
    wrapFocus = false,
    onclose,
    onkeydown,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const titleId = `${uid}-title`;
  const toaster = findToaster();
  let dialog = $state<HTMLDialogElement>();
  let panel = $state<HTMLDivElement>();
  let phase = $state<ModalPhase>('closed');
  let pressedBackdrop = false;

  function hide(): void {
    open = false;
  }

  function focusFirst(): void {
    const first = dialog?.querySelector('[autofocus]') ?? dialog?.querySelector('.drawer-close');
    if (first instanceof HTMLElement) first.focus({ preventScroll: true });
  }

  async function leave(): Promise<void> {
    await tick();
    await animationsSettled([dialog, panel].filter((element) => element !== undefined));
    send('left');
  }

  function send(event: ModalEvent): void {
    const next = modalStep(phase, event);
    phase = next.phase;
    match(next.effect)
      .with('none', () => {})
      .with('show-modal', () => {
        dialog?.toggleAttribute(
          'data-page-scrollbar',
          showsScrollbar(window, document.documentElement),
        );
        dialog?.showModal();
        focusFirst();
      })
      .with('start-leaving', () => void leave())
      .with('close', () => dialog?.close())
      .exhaustive();
  }

  $effect(() => {
    const wanted = open;
    untrack(() => send(wanted ? 'show' : 'hide'));
  });

  function cancel(event: Event): void {
    event.preventDefault();
    hide();
  }

  function closed(event: Event & { currentTarget: EventTarget & HTMLDialogElement }): void {
    send('closed');
    open = false;
    onclose?.(event);
  }

  function keydown(
    event: KeyboardEvent & { currentTarget: EventTarget & HTMLDialogElement },
  ): void {
    onkeydown?.(event);
    if (!wrapFocus || event.key !== 'Tab' || event.defaultPrevented) return;
    const stops = tabStops(event.currentTarget);
    const current = stops.findIndex((stop) => stop === document.activeElement);
    const target = wrappedStop(stops.length, current, event.shiftKey);
    if (target === null) return;
    event.preventDefault();
    stops[target]?.focus();
  }

  function pointerdown(event: PointerEvent): void {
    pressedBackdrop = event.target === dialog;
  }

  function click(event: MouseEvent): void {
    if (pressedBackdrop && event.target === dialog) hide();
    pressedBackdrop = false;
  }
</script>

<dialog
  {...rest}
  bind:this={dialog}
  aria-labelledby={titleId}
  class={['drawer-backdrop', { 'is-leaving': phase === 'leaving' }, className]}
  oncancel={cancel}
  onclose={closed}
  onkeydown={keydown}
  onpointerdown={pointerdown}
  onclick={click}
>
  <div bind:this={panel} class={['drawer', DRAWER_SIDES[side]]}>
    <div class="drawer-header">
      <h2 class="drawer-title" id={titleId}>{title}</h2>
      {#if closeButton}
        <button type="button" class="drawer-close" aria-label={closeLabel} onclick={hide}>
          <X class="close-icon" />
        </button>
      {/if}
    </div>
    <div class="drawer-body">
      {@render children?.()}
    </div>
    {#if footer}
      <div class="drawer-footer">
        {@render footer(hide)}
      </div>
    {/if}
  </div>
  {#if phase !== 'closed' && toaster !== undefined}
    <ToastRegion {toaster} clearance={false} />
  {/if}
</dialog>
