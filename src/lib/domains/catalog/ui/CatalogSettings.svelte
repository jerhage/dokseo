<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import type { Notify } from '$lib/shared/notice';
  import type { CatalogReads } from '../queries/catalog-queries';
  import { catalogListOf } from './catalog-list';
  import { CatalogSettingsView } from './catalog-settings.svelte';
  import type { CatalogSettingsUseCases } from './catalog-settings.svelte';
  import { catalogDescription } from './catalog-texts';
  import CatalogForm from './CatalogForm.svelte';
  import CatalogsData from './CatalogsData.svelte';
  import RemoveCatalog from './RemoveCatalog.svelte';

  type Props = {
    readonly catalog: Pick<CatalogReads, 'listCatalogs'> & CatalogSettingsUseCases;
    readonly notify: Notify;
  };

  let { catalog, notify }: Props = $props();

  const view = new CatalogSettingsView(
    {
      addCatalog: (draft) => catalog.addCatalog(draft),
      editCatalog: (id, draft) => catalog.editCatalog(id, draft),
      removeCatalog: (id) => catalog.removeCatalog(id),
      unlockCatalog: (id, password) => catalog.unlockCatalog(id, password),
      testCatalogConnection: (draft, password) => catalog.testCatalogConnection(draft, password),
    },
    (notice) => notify(notice),
  );
</script>

<div class="col gap-6 prose">
  <header class="col gap-1">
    <h1 class="text-lg">Catalogs</h1>
    <p class="text-sm text-muted">
      A catalog is an OPDS server, such as Calibre, that you browse for books to download.
    </p>
  </header>

  <CatalogsData {catalog}>
    {#snippet children(state)}
      {#if state.kind === 'failed'}
        <Alert variant="danger" title="Catalogs could not be read">{state.message}</Alert>
      {:else if state.kind === 'ready'}
        {@const list = catalogListOf(state.value)}
        {#if list.kind === 'storage-unavailable'}
          <Alert variant="warning"
            >This browser blocks local storage, so catalogs cannot be kept.</Alert
          >
        {:else if list.catalogs.length === 0 && list.unreadable.length === 0}
          <EmptyState
            message="No catalogs yet. Add an OPDS server, such as Calibre, to browse and download its books."
          >
            {#snippet action()}
              <Button variant="primary" onclick={() => view.startAdd()}>Add catalog</Button>
            {/snippet}
          </EmptyState>
        {:else}
          <ListGroup>
            {#each list.catalogs as item (item.id)}
              <ListRow title={item.title} description={catalogDescription(item)}>
                {#snippet actions()}
                  <Button size="sm" variant="ghost" onclick={() => view.startEdit(item)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost-danger" onclick={() => view.askRemove(item)}>
                    Remove
                  </Button>
                {/snippet}
              </ListRow>
            {/each}
            {#each list.unreadable as id (id)}
              <ListRow
                title="A catalog that could not be read"
                description="Remove it to clear it."
              >
                {#snippet actions()}
                  <Button
                    size="sm"
                    variant="ghost-danger"
                    onclick={() => view.askRemoveUnreadable(id)}
                  >
                    Remove
                  </Button>
                {/snippet}
              </ListRow>
            {/each}
          </ListGroup>
          <div class="row">
            <Button variant="primary" onclick={() => view.startAdd()}>Add catalog</Button>
          </div>
        {/if}
      {/if}
    {/snippet}
  </CatalogsData>

  {#if view.target !== null}
    <CatalogForm {view} />
  {/if}
  {#if view.removing !== null}
    <RemoveCatalog {view} removal={view.removing} />
  {/if}
</div>
