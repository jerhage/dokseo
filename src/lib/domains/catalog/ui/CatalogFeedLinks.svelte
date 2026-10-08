<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import type { NavigationFeed, NavigationLink } from '../domain/opds-feed';

  type Props = {
    readonly feed: NavigationFeed;
    readonly onopen: (link: NavigationLink) => void;
  };

  let { feed, onopen }: Props = $props();
</script>

{#if feed.links.length === 0}
  <EmptyState message="Nothing to browse here." />
{:else}
  <ListGroup aria-label={feed.title}>
    {#each feed.links as link (link.href)}
      <ListRow title={link.title} description={link.summary === '' ? undefined : link.summary}>
        {#snippet actions()}
          <Button size="sm" variant="ghost" onclick={() => onopen(link)}>Open</Button>
        {/snippet}
      </ListRow>
    {/each}
  </ListGroup>
{/if}
