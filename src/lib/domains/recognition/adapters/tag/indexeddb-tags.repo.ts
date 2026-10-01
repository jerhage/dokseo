import { deleteRecord, listRecords, putRecord } from '$lib/platform/idb/connection';
import type { TagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { byName, tagFromStored } from '../../domain/tag/tag';
import type { StoredTag, Tag } from '../../domain/tag/tag';
import type { TagListing, TagRepository, TagWrite } from '../../domain/tag/tag-repository';
import { TAG_STORE, recognitionDatabase, recordsAvailable } from '../recognition-database';

const WRITTEN: TagWrite = { kind: 'success' };

function createTagRepository(): TagRepository {
  return {
    async list(): Promise<TagListing> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const records = await listRecords<StoredTag>(await recognitionDatabase(), TAG_STORE);
      return { kind: 'success', tags: byName(records.map(tagFromStored)) };
    },

    async save(tag: Tag): Promise<TagWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await putRecord(await recognitionDatabase(), TAG_STORE, tag);
      return WRITTEN;
    },

    async remove(tag: TagId): Promise<TagWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await deleteRecord(await recognitionDatabase(), TAG_STORE, tag);
      return WRITTEN;
    },
  };
}

export { createTagRepository };
