<script lang="ts">
  import { onMount } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Breadcrumb from '$lib/ui/components/Breadcrumb.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import { unreachable } from '$lib/shared/unreachable';
  import type { BookId } from '$lib/shared/ids';
  import type { HeaderField } from './catalog-search';
  import type { CatalogBrowseView } from './catalog-browse.svelte';
  import { browseFailureText } from './catalog-texts';
  import CatalogFeedLinks from './CatalogFeedLinks.svelte';
  import CatalogMore from './CatalogMore.svelte';
  import CatalogPasswordModal from './CatalogPasswordModal.svelte';
  import CatalogPublications from './CatalogPublications.svelte';
  import CatalogSearchField from './CatalogSearchField.svelte';
  import { scrollMemory } from './scroll-memory';

  type Props = {
    readonly view: CatalogBrowseView;
    readonly search: HeaderField;
    readonly readerHref: (id: BookId) => string;
  };

  let { view, search, readerHref }: Props = $props();

  onMount(() => {
    void view.start();
  });
</script>

<div class="col gap-4" {@attach scrollMemory((scroller) => view.bindScroller(scroller))}>
  <CatalogSearchField field={search} />
  <Breadcrumb items={view.crumbs} label="Catalog path" />

  {#if view.state.kind === 'loading'}
    <EmptyState live message="Reading the catalog…" />
  {:else if view.state.kind === 'navigation'}
    <CatalogFeedLinks
      label={view.state.feed.title}
      links={view.links}
      onopen={(link) => void view.openLink(link)}
    />
  {:else if view.state.kind === 'acquisition'}
    <CatalogPublications {view} publications={view.entries} {readerHref} />
  {:else if view.state.kind === 'unlock'}
    <EmptyState message="This catalog needs its password.">
      {#snippet action()}
        <Button variant="primary" onclick={() => view.askPassword()}>Enter password</Button>
      {/snippet}
    </EmptyState>
    {#if view.prompting}
      <CatalogPasswordModal {view} refused={view.state.refused} />
    {/if}
  {:else if view.state.kind === 'failed'}
    <Alert variant="warning" title="This catalog could not be read.">
      {browseFailureText(view.state.failure, view.catalog.protocol)}
      {#snippet actions()}
        <Button size="sm" onclick={() => void view.load()}>Try again</Button>
      {/snippet}
    </Alert>
  {:else}
    {unreachable(view.state)}
  {/if}

  {#if view.state.kind === 'navigation' || view.state.kind === 'acquisition'}
    <CatalogMore {view} />
  {/if}
</div>
