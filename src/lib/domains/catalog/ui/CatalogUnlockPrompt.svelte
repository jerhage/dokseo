<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import type { CatalogId } from '$lib/shared/ids';
  import type { CatalogReads } from '../queries/catalog-queries';
  import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';
  import { listedCatalogs } from './catalog-list';
  import CatalogPasswordModal from './CatalogPasswordModal.svelte';
  import CatalogsData from './CatalogsData.svelte';
  import RememberedData from './RememberedData.svelte';
  import { unlockCatalogNow } from './unlock-catalog-now';

  type Props = {
    readonly catalog: Pick<CatalogReads, 'listCatalogs' | 'listRememberedPasswords'> & {
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

  const client = useQueryClient();
</script>

<CatalogsData {catalog}>
  {#snippet children(state)}
    {@const found = listedCatalogs(state).find((candidate) => candidate.id === catalogId)}
    {#if found !== undefined}
      <RememberedData {catalog}>
        {#snippet children(remembered)}
          <CatalogPasswordModal
            catalog={found}
            {refused}
            remembered={remembered.has(catalogId)}
            onunlock={(password, remember) => {
              void unlockCatalogNow(catalog, client, catalogId, password, remember);
              onunlocked();
            }}
            {ondismiss}
          />
        {/snippet}
      </RememberedData>
    {/if}
  {/snippet}
</CatalogsData>
