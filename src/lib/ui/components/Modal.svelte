<script lang="ts">
  import { match } from 'ts-pattern';
  import { tick, untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { HTMLDialogAttributes } from 'svelte/elements';
  import { animationsSettled } from './animations';
  import { MODAL_PLACEMENTS, MODAL_SIZES } from './classes';
  import { tabStops, wrappedStop } from './focus-wrap';
  import X from './icons/X.svelte';
  import type { ModalPlacement, ModalSize } from './classes';
  import { modalHeading, modalLabelledBy } from './modal-heading';
  import { modalStep } from './modal-phase';
  import type { ModalEvent, ModalPhase } from './modal-phase';
  import { showsScrollbar } from './scrollbar';
  import { findToaster } from './toast-context';
  import ToastRegion from './ToastRegion.svelte';

  type Heading =
    | { title: string; closeButton?: boolean; header?: undefined }
    | {
        title?: undefined;
        closeButton?: undefined;
        header?: Snippet<[() => void]>;
        'aria-label': string;
      }
    | {
        title?: undefined;
        closeButton?: undefined;
        header?: Snippet<[() => void]>;
        'aria-labelledby': string;
      };

  type Props = Omit<HTMLDialogAttributes, 'title' | 'open'> &
    Heading & {
      open?: boolean;
      size?: ModalSize;
      placement?: ModalPlacement;
      fillNarrow?: boolean;
      sheetNarrow?: boolean;
      flushBody?: boolean;
      closeLabel?: string;
      footer?: Snippet<[() => void]>;
      infoFooter?: boolean;
      wrapFocus?: boolean;
    };

  let {
    open = $bindable(false),
    title,
    closeButton = true,
    header,
    size = 'md',
    placement = 'center',
    fillNarrow = false,
    sheetNarrow = false,
    flushBody = false,
    closeLabel = 'Close',
    footer,
    infoFooter = false,
    wrapFocus = false,
    'aria-labelledby': labelledBy,
    onclose,
    onkeydown,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const titleId = `${uid}-title`;
  const toaster = findToaster();
  const heading = $derived(modalHeading(title, header));
  let dialog = $state<HTMLDialogElement>();
  let panel = $state<HTMLDivElement>();
  let phase = $state<ModalPhase>('closed');
  const leaving = $derived(phase === 'leaving');
  let pressedBackdrop = false;

  function hide(): void {
    open = false;
  }

  function focusFirst(): void {
    const first = dialog?.querySelector('[autofocus]') ?? dialog?.querySelector('.modal-close');
    if (first instanceof HTMLElement) first.focus();
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
  aria-labelledby={modalLabelledBy(heading, titleId, labelledBy)}
  class={[
    'modal-backdrop',
    {
      'modal-fill-narrow': fillNarrow,
      'modal-sheet': sheetNarrow,
      'is-leaving': leaving,
    },
    className,
  ]}
  oncancel={cancel}
  onclose={closed}
  onkeydown={keydown}
  onpointerdown={pointerdown}
  onclick={click}
>
  <div bind:this={panel} class={['modal', MODAL_SIZES[size], MODAL_PLACEMENTS[placement]]}>
    {#if heading.kind === 'title'}
      <div class="modal-header">
        <h2 class="modal-title" id={titleId}>{heading.title}</h2>
        {#if closeButton}
          <button type="button" class="modal-close" aria-label={closeLabel} onclick={hide}>
            <X class="close-icon" />
          </button>
        {/if}
      </div>
    {:else if heading.kind === 'custom'}
      <div class="modal-header modal-header-bar">
        {@render heading.header(hide)}
      </div>
    {/if}
    <div class={['modal-body', { 'modal-body-flush': flushBody }]}>
      {@render children?.()}
    </div>
    {#if footer}
      <div class={['modal-footer', { 'modal-footer-info': infoFooter }]}>
        {@render footer(hide)}
      </div>
    {/if}
  </div>
  {#if phase !== 'closed' && toaster !== undefined}
    <ToastRegion {toaster} clearance={false} />
  {/if}
</dialog>
