<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import { addressKey } from '../domain/catalog-feed';
  import type { NavigationLink } from '../domain/catalog-feed';

  type Props = {
    readonly label: string;
    readonly links: readonly NavigationLink[];
    readonly resolving: string | null;
    readonly onopen: (link: NavigationLink) => void;
  };

  let { label, links, resolving, onopen }: Props = $props();
</script>

{#if links.length === 0}
  <EmptyState message="Nothing to browse here." />
{:else}
  <ListGroup aria-label={label}>
    {#each links as link (addressKey(link.address))}
      <ListRow title={link.title} description={link.summary === '' ? undefined : link.summary}>
        {#snippet actions()}
          <Button
            size="sm"
            variant="ghost"
            loading={resolving === addressKey(link.address)}
            disabled={resolving !== null}
            onclick={() => onopen(link)}>Open</Button
          >
        {/snippet}
      </ListRow>
    {/each}
  </ListGroup>
{/if}
