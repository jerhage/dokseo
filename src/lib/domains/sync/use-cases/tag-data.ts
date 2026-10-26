import { CorruptRow, isStoredFields } from '$lib/shared/corrupt-row';
import { tagFromStored } from '$lib/domains/recognition/domain/tag/tag';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import type { TagId } from '$lib/shared/ids';
import { unreadableData } from './unreadable-data';
import type { UnreadableData } from './unreadable-data';

type TagData = {
  readonly name: string;
  readonly colour: string;
  readonly createdAt: number;
};

type TagFromSyncData = { readonly kind: 'success'; readonly tag: Tag } | UnreadableData;

function toSyncTagData(tag: Tag): TagData {
  return { name: tag.name, colour: tag.colour, createdAt: tag.createdAt };
}

function fromSyncTagData(data: unknown, recordId: TagId): TagFromSyncData {
  try {
    if (!isStoredFields(data)) throw new CorruptRow('tag', 'data', data);
    const tag = tagFromStored({ ...data, id: recordId });
    return { kind: 'success', tag };
  } catch (cause) {
    return unreadableData(cause);
  }
}

export { fromSyncTagData, toSyncTagData };
export type { TagData, TagFromSyncData };
