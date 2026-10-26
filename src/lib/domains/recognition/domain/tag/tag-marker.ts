import { changeMarker } from '$lib/shared/change-marker';
import type { ChangeMarker } from '$lib/shared/change-marker';
import type { TagId } from '$lib/shared/ids';

function tagMarker(id: TagId, deleted: boolean, at: number): ChangeMarker {
  return changeMarker('tag', id, deleted, at);
}

export { tagMarker };
