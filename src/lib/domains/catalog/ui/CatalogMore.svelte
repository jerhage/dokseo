<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import type { MoreState } from '$lib/shared/read-paged-state';
  import type { CatalogProtocol } from '../domain/catalog-protocol';
  import type { FeedProblem } from '../queries/catalog-feed-queries';
  import { feedProblemText } from './catalog-texts';
  import { reachEnd } from './reach-end';

  type Props = {
    readonly more: MoreState<FeedProblem>;
    readonly protocol: CatalogProtocol;
    readonly onmore: () => void;
  };

  let { more, protocol, onmore }: Props = $props();
</script>

{#if more.kind === 'failed'}
  <Alert variant="warning" title="More books could not be loaded.">
    {feedProblemText(more.failure, protocol)}
    {#snippet actions()}
      <Button size="sm" onclick={onmore}>Try again</Button>
    {/snippet}
  </Alert>
{:else if more.kind === 'loading'}
  <div class="row justify-center">
    <span class="text-sm text-muted" aria-live="polite">Loading more…</span>
  </div>
{:else if more.kind === 'more'}
  <div class="row justify-center" {@attach reachEnd(onmore)}>
    <Button size="sm" onclick={onmore}>Load more</Button>
  </div>
{/if}
