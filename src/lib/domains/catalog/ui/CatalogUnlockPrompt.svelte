<script lang="ts">
  import type { CatalogId } from '$lib/shared/ids';
  import type { CatalogReads } from '../queries/catalog-queries';
  import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';
  import { listedCatalogs } from './catalog-list';
  import CatalogPasswordModal from './CatalogPasswordModal.svelte';
  import CatalogsData from './CatalogsData.svelte';

  type Props = {
    readonly catalog: Pick<CatalogReads, 'listCatalogs'> & {
      readonly unlockCatalog: (
        id: CatalogId,
        password: string,
        remember: boolean,
      ) => Promise<UnlockCatalogResult>;
    };
    readonly catalogId: CatalogId;
    readonly refused: boolean;
    readonly onunlocked: () => void;
    readonly ondismiss: () => void;
  };

  let { catalog, catalogId, refused, onunlocked, ondismiss }: Props = $props();
</script>

<CatalogsData {catalog}>
  {#snippet children(state)}
    {@const found = listedCatalogs(state).find((candidate) => candidate.id === catalogId)}
    {#if found !== undefined}
      <CatalogPasswordModal
        catalog={found}
        {refused}
        onunlock={(password) => {
          void catalog.unlockCatalog(catalogId, password, false);
          onunlocked();
        }}
        {ondismiss}
      />
    {/if}
  {/snippet}
</CatalogsData>
