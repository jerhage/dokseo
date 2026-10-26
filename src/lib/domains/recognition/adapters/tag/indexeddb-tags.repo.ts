import { listRecords, writeRecords } from '$lib/platform/idb/connection';
import { markingWrites } from '$lib/platform/idb/marking-writes';
import type { ChangeTracking } from '$lib/shared/change-marker';
import type { TagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { byName, tagsFromStored } from '../../domain/tag/tag';
import type { StoredTag, Tag } from '../../domain/tag/tag';
import { tagMarker } from '../../domain/tag/tag-marker';
import type { TagListing, TagRepository, TagWrite } from '../../domain/tag/tag-repository';
import { TAG_STORE, recognitionDatabase, recordsAvailable } from '../recognition-database';

const WRITTEN: TagWrite = { kind: 'success' };

function createTagRepository(tracking: ChangeTracking = 'marked'): TagRepository {
  return {
    async list(): Promise<TagListing> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const records = await listRecords<StoredTag>(await recognitionDatabase(), TAG_STORE);
      const { tags, unreadable } = tagsFromStored(records);
      return { kind: 'success', tags: byName(tags), unreadable };
    },

    async save(tag: Tag): Promise<TagWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await writeRecords(await recognitionDatabase(), [
        { kind: 'put', store: TAG_STORE, record: tag },
        ...markingWrites(tracking, [tagMarker(tag.id, false, Date.now())]),
      ]);
      return WRITTEN;
    },

    async remove(tag: TagId): Promise<TagWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await writeRecords(await recognitionDatabase(), [
        { kind: 'delete', store: TAG_STORE, key: tag },
        ...markingWrites(tracking, [tagMarker(tag, true, Date.now())]),
      ]);
      return WRITTEN;
    },
  };
}

export { createTagRepository };
