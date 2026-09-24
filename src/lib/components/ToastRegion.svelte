<script lang="ts">
  import { untrack } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Toast from './Toast.svelte';
  import { getToaster } from './toast-context';
  import type { Toaster } from './toaster.svelte';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    toaster?: Toaster;
    dismissLabel?: string;
  };

  let { toaster, dismissLabel = 'Dismiss', class: className, ...rest }: Props = $props();

  const fromContext = untrack(() => toaster) === undefined ? getToaster() : undefined;
  const shown = $derived(toaster ?? fromContext);
</script>

<div {...rest} aria-live="polite" class={['toast-region', className]}>
  {#if shown !== undefined}
    {#each shown.toasts as toast (toast.id)}
      <Toast {toast} toaster={shown} {dismissLabel} />
    {/each}
  {/if}
</div>
