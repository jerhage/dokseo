<script lang="ts">
  import { onMount } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Breadcrumb from '$lib/ui/components/Breadcrumb.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import { unreachable } from '$lib/shared/unreachable';
  import type { BookId } from '$lib/shared/ids';
  import type { CatalogBrowseView } from './catalog-browse.svelte';
  import { browseFailureText } from './catalog-texts';
  import CatalogFeedLinks from './CatalogFeedLinks.svelte';
  import CatalogPasswordModal from './CatalogPasswordModal.svelte';
  import CatalogPublications from './CatalogPublications.svelte';

  type Props = {
    readonly view: CatalogBrowseView;
    readonly readerHref: (id: BookId) => string;
  };

  let { view, readerHref }: Props = $props();

  onMount(() => {
    void view.start();
  });

  function followCrumb(event: MouseEvent): void {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (link === null) return;
    if (view.followCrumb(link.getAttribute('href') ?? '')) event.preventDefault();
  }
</script>

<div class="col gap-4">
  <Breadcrumb items={view.crumbs} label="Catalog path" onclick={followCrumb} />

  {#if view.state.kind === 'loading'}
    <EmptyState live message="Reading the catalog…" />
  {:else if view.state.kind === 'navigation'}
    <CatalogFeedLinks feed={view.state.feed} onopen={(link) => void view.openLink(link)} />
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
      {browseFailureText(view.state.failure)}
      {#snippet actions()}
        <Button size="sm" onclick={() => void view.load()}>Try again</Button>
      {/snippet}
    </Alert>
  {:else}
    {unreachable(view.state)}
  {/if}

  {#if view.state.kind === 'navigation' || view.state.kind === 'acquisition'}
    {#if view.paging.previous !== null || view.paging.next !== null}
      <div class="row items-center gap-2">
        <Button
          size="sm"
          disabled={view.paging.previous === null}
          onclick={() => void view.previous()}
        >
          Previous
        </Button>
        <Button size="sm" disabled={view.paging.next === null} onclick={() => void view.next()}>
          Next
        </Button>
      </div>
    {/if}
  {/if}
</div>
