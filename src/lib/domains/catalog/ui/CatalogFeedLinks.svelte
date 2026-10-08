<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import type { NavigationLink } from '../domain/catalog-feed';

  type Props = {
    readonly label: string;
    readonly links: readonly NavigationLink[];
    readonly onopen: (link: NavigationLink) => void;
  };

  let { label, links, onopen }: Props = $props();
</script>

{#if links.length === 0}
  <EmptyState message="Nothing to browse here." />
{:else}
  <ListGroup aria-label={label}>
    {#each links as link (link.href)}
      <ListRow title={link.title} description={link.summary === '' ? undefined : link.summary}>
        {#snippet actions()}
          <Button size="sm" variant="ghost" onclick={() => onopen(link)}>Open</Button>
        {/snippet}
      </ListRow>
    {/each}
  </ListGroup>
{/if}
