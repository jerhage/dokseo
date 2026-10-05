<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import type { BookCapturesExport } from './book-captures-export.svelte';

  type Props = { readonly view: BookCapturesExport };

  let { view }: Props = $props();

  const offer = $derived(view.offer);
</script>

{#if offer.kind === 'export'}
  <div class="col gap-2 items-start">
    <Button
      size="sm"
      variant="outline"
      loading={offer.busy}
      disabled={offer.busy}
      onclick={() => void view.save()}
    >
      Export these captures
    </Button>
    {#if offer.confirmation !== null}
      <p class="m-0 text-sm text-muted" role="status">{offer.confirmation}</p>
    {/if}
  </div>
{:else if offer.kind === 'another-tap'}
  <div class="col gap-2 items-start">
    <p class="m-0 text-sm" role="status">{offer.prompt}</p>
    <Button size="sm" variant="primary" onclick={() => void view.save()}>Save file</Button>
  </div>
{/if}
