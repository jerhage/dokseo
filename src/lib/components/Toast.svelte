<script lang="ts">
  import { untrack } from 'svelte';
  import { animationsSettled } from './animations';
  import { announcementRole } from './announcement';
  import { TOAST_VARIANTS } from './classes';
  import X from './icons/X.svelte';
  import StatusIcon from './StatusIcon.svelte';
  import { toastTimeout } from './toast-duration';
  import { ToastTimer } from './toast-timer';
  import type { Toast, Toaster } from './toaster.svelte';

  type Props = {
    toast: Toast;
    toaster: Toaster;
    dismissLabel: string;
  };

  let { toast, toaster, dismissLabel }: Props = $props();

  let element = $state<HTMLDivElement>();
  let persistent = $state(false);
  let timer: ToastTimer | undefined;

  $effect(() => {
    const node = element;
    if (node === undefined) return;
    untrack(() => {
      const css = getComputedStyle(node).getPropertyValue('--toast-duration');
      const ms = toastTimeout(toast.duration, css);
      if (ms === undefined) persistent = true;
      else timer = new ToastTimer(ms, () => toaster.dismiss(toast.id));
    });
    return () => timer?.stop();
  });

  $effect(() => {
    const node = element;
    if (toast.phase !== 'leaving' || node === undefined) return;
    timer?.stop();
    const id = toast.id;
    void animationsSettled([node]).then(() => toaster.remove(id));
  });

  function focusout(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && element?.contains(next)) return;
    timer?.resume('focus');
  }
</script>

<div
  bind:this={element}
  role={announcementRole(toast.variant)}
  class={[
    'toast',
    TOAST_VARIANTS[toast.variant],
    { 'toast-persistent': persistent, 'is-leaving': toast.phase === 'leaving' },
  ]}
  style:--toast-timeout={toast.duration.kind === 'timed' ? `${toast.duration.ms}ms` : undefined}
  onmouseenter={() => timer?.pause('hover')}
  onmouseleave={() => timer?.resume('hover')}
  onfocusin={() => timer?.pause('focus')}
  onfocusout={focusout}
>
  <StatusIcon variant={toast.variant} class="toast-icon" />
  <div class="toast-content">
    <p class="toast-title">{toast.title}</p>
    {#if toast.message !== undefined}
      <p class="toast-description">{toast.message}</p>
    {/if}
  </div>
  <button
    type="button"
    class="toast-close"
    aria-label={dismissLabel}
    onclick={() => toaster.dismiss(toast.id)}
  >
    <X class="close-icon" />
  </button>
</div>
