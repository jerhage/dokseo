<script lang="ts">
  import { untrack } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { TOAST_REGION_PLACEMENTS } from './classes';
  import type { ToastPlacement } from './classes';
  import Toast from './Toast.svelte';
  import { getToaster } from './toast-context';
  import { entersTopLayer } from './top-layer';
  import type { RegionId, Toaster } from './toaster.svelte';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    toaster?: Toaster;
    dismissLabel?: string;
    clearance?: boolean;
    placement?: ToastPlacement;
  };

  let {
    toaster,
    dismissLabel = 'Dismiss',
    clearance = true,
    placement = 'bottom',
    class: className,
    ...rest
  }: Props = $props();

  const fromContext = untrack(() => toaster) === undefined ? getToaster() : undefined;
  const shown = $derived(toaster ?? fromContext);

  let element = $state<HTMLDivElement>();
  let region = $state<RegionId>();

  const active = $derived(
    shown !== undefined && region !== undefined && shown.regionFor(placement) === region,
  );

  $effect(() => {
    const host = shown;
    if (host === undefined) return;
    const id = host.attachRegion(placement);
    region = id;
    return () => {
      host.detachRegion(id);
      region = undefined;
    };
  });

  $effect(() => {
    const node = element;
    if (node === undefined || !active) return;
    node.showPopover();
    const raise = (event: Event): void => {
      if (!entersTopLayer(event, node)) return;
      node.hidePopover();
      node.showPopover();
    };
    document.addEventListener('toggle', raise, { capture: true });
    return () => {
      document.removeEventListener('toggle', raise, { capture: true });
      if (node.matches(':popover-open')) node.hidePopover();
    };
  });
</script>

<div
  {...rest}
  bind:this={element}
  popover="manual"
  aria-live="polite"
  class={['toast-region', TOAST_REGION_PLACEMENTS[placement], className]}
  style:--toast-offset-block-end={clearance && shown !== undefined
    ? `${shown.clearance}px`
    : undefined}
>
  {#if shown !== undefined && region !== undefined && active}
    {#each shown.toastsIn(region) as toast (toast.id)}
      <Toast {toast} toaster={shown} {dismissLabel} />
    {/each}
  {/if}
</div>
