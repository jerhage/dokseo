<script lang="ts">
  import { match } from 'ts-pattern';
  import { tick, untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { HTMLDialogAttributes } from 'svelte/elements';
  import { animationsSettled } from './animations';
  import { MODAL_SIZES } from './classes';
  import type { ModalSize } from './classes';
  import { modalStep } from './modal-phase';
  import type { ModalEvent, ModalPhase } from './modal-phase';

  type Props = Omit<HTMLDialogAttributes, 'title' | 'open'> & {
    open?: boolean;
    title: string;
    size?: ModalSize;
    closeLabel?: string;
    footer?: Snippet<[() => void]>;
  };

  let {
    open = $bindable(false),
    title,
    size = 'md',
    closeLabel = 'Close',
    footer,
    onclose,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const uid = $props.id();
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
  aria-labelledby="{uid}-title"
  class={['modal-backdrop', { 'is-leaving': phase === 'leaving' }, className]}
  oncancel={cancel}
  onclose={closed}
  onpointerdown={pointerdown}
  onclick={click}
>
  <div bind:this={panel} class={['modal', MODAL_SIZES[size]]}>
    <div class="modal-header">
      <h2 class="modal-title" id="{uid}-title">{title}</h2>
      <button type="button" class="modal-close" aria-label={closeLabel} onclick={hide}></button>
    </div>
    <div class="modal-body">
      {@render children?.()}
    </div>
    {#if footer}
      <div class="modal-footer">
        {@render footer(hide)}
      </div>
    {/if}
  </div>
</dialog>
