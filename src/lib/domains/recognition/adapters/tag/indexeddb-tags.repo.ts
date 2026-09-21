import { deleteRecord, listRecords, putRecord } from '$lib/platform/idb/connection';
import { describeCause } from '$lib/shared/cause';
import type { TagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { byName, tagFromStored } from '../../domain/tag/tag';
import type { StoredTag, Tag } from '../../domain/tag/tag';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';
import { TAG_STORE, recognitionDatabase, recordsAvailable } from '../recognition-database';

function unavailable(): Result<never, TagError> {
  return err({ kind: 'storage-unavailable' });
}

function failed(cause: unknown): Result<never, TagError> {
  return err({ kind: 'storage-failed', cause: describeCause(cause) });
}

function createTagRepository(): TagRepository {
  return {
    async list(): Promise<Result<readonly Tag[], TagError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const records = await listRecords<StoredTag>(await recognitionDatabase(), TAG_STORE);
        return ok(byName(records.map(tagFromStored)));
      } catch (cause) {
        return failed(cause);
      }
    },

    async save(tag: Tag): Promise<Result<void, TagError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        await putRecord(await recognitionDatabase(), TAG_STORE, tag);
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },

    async remove(tag: TagId): Promise<Result<void, TagError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        await deleteRecord(await recognitionDatabase(), TAG_STORE, tag);
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}

export { createTagRepository };
