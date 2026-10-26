import { changeMarker } from '$lib/shared/change-marker';
import type { ChangeMarker } from '$lib/shared/change-marker';
import type { CatalogId } from '$lib/shared/ids';

function catalogMarker(id: CatalogId, deleted: boolean, at: number): ChangeMarker {
  return changeMarker('catalog', id, deleted, at);
}

export { catalogMarker };
