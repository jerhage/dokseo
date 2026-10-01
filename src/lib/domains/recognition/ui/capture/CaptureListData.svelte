<script lang="ts">
  import type { Snippet } from 'svelte';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { unreachable } from '$lib/shared/unreachable';
  import type { Card } from './capture-card-projection';
  import { captureListBody } from './capture-read';
  import type { CaptureRead } from './capture-read';

  type Props = {
    readonly state: CaptureRead;
    readonly cards: readonly Card[];
    readonly invitation: string;
    readonly onretry: () => void;
    readonly above: Snippet;
    readonly children: Snippet<[readonly Card[]]>;
  };

  let { state, cards, invitation, onretry, above, children }: Props = $props();

  const body = $derived(captureListBody(state, cards.length));
</script>

<div class="col gap-2 px-3 pt-3">
  {@render above()}

  {#if state.kind === 'failed'}
    <Alert variant="danger" title="Your captures could not be loaded">
      {state.message}
      {#snippet actions()}
        <Button size="sm" onclick={onretry}>Try again</Button>
      {/snippet}
    </Alert>
  {/if}
</div>

<div class="col gap-2 p-3">
  {#if body === 'cards'}
    {@render children(cards)}
  {:else if body === 'reading'}
    <EmptyState class="p-2" live message="Reading captures…" />
  {:else if body === 'invitation'}
    <EmptyState class="p-2" message={invitation} />
  {:else if body === 'nothing'}{:else}
    {unreachable(body)}
  {/if}
</div>
