<script lang="ts">
  import { match } from 'ts-pattern';
  import { tick, untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { HTMLDialogAttributes } from 'svelte/elements';
  import { animationsSettled } from './animations';
  import { MODAL_BODIES, MODAL_FOOTERS, MODAL_PLACEMENTS, MODAL_SIZES } from './classes';
  import type { ModalBody, ModalFooter, ModalPlacement, ModalSize } from './classes';
  import { modalHeading, modalLabelledBy } from './modal-heading';
  import { modalStep } from './modal-phase';
  import type { ModalEvent, ModalPhase } from './modal-phase';
  import { showsScrollbar } from './scrollbar';

  type Heading =
    | { title: string; header?: undefined }
    | { title?: undefined; header?: Snippet<[() => void]>; 'aria-label': string }
    | { title?: undefined; header?: Snippet<[() => void]>; 'aria-labelledby': string };

  type Props = Omit<HTMLDialogAttributes, 'title' | 'open'> &
    Heading & {
      open?: boolean;
      size?: ModalSize;
      placement?: ModalPlacement;
      body?: ModalBody;
      closeLabel?: string;
      footer?: Snippet<[() => void]>;
      footerVariant?: ModalFooter;
    };

  let {
    open = $bindable(false),
    title,
    header,
    size = 'md',
    placement = 'center',
    body = 'padded',
    closeLabel = 'Close',
    footer,
    footerVariant = 'actions',
    'aria-labelledby': labelledBy,
    onclose,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const titleId = `${uid}-title`;
  const heading = $derived(modalHeading(title, header));
  let dialog = $state<HTMLDialogElement>();
  let panel = $state<HTMLDivElement>();
  let phase = $state<ModalPhase>('closed');
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
  class={['modal-backdrop', { 'is-leaving': phase === 'leaving' }, className]}
  oncancel={cancel}
  onclose={closed}
  onpointerdown={pointerdown}
  onclick={click}
>
  <div bind:this={panel} class={['modal', MODAL_SIZES[size], MODAL_PLACEMENTS[placement]]}>
    {#if heading.kind === 'title'}
      <div class="modal-header">
        <h2 class="modal-title" id={titleId}>{heading.title}</h2>
        <button type="button" class="modal-close" aria-label={closeLabel} onclick={hide}></button>
      </div>
    {:else if heading.kind === 'custom'}
      {@render heading.header(hide)}
    {/if}
    <div class={['modal-body', MODAL_BODIES[body]]}>
      {@render children?.()}
    </div>
    {#if footer}
      <div class={['modal-footer', MODAL_FOOTERS[footerVariant]]}>
        {@render footer(hide)}
      </div>
    {/if}
  </div>
</dialog>
