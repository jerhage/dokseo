import type { TagId } from '$lib/shared/ids';
import { createTagRepository } from '../domains/recognition/adapters/tag/indexeddb-tags.repo';
import type { Capture } from '../domains/recognition/domain/capture/capture';
import type { CaptureRepository } from '../domains/recognition/domain/capture/capture-repository';
import type { Tag } from '../domains/recognition/domain/tag/tag';
import type { TagColour } from '../domains/recognition/domain/tag/tag-colour';
import { addTagToCapture } from '../domains/recognition/use-cases/tag/add-tag-to-capture';
import type { AddTagToCaptureResult } from '../domains/recognition/use-cases/tag/add-tag-to-capture';
import { createTag } from '../domains/recognition/use-cases/tag/create-tag';
import type { CreateTagResult } from '../domains/recognition/use-cases/tag/create-tag';
import { deleteTag } from '../domains/recognition/use-cases/tag/delete-tag';
import type { DeleteTagResult } from '../domains/recognition/use-cases/tag/delete-tag';
import { listTags } from '../domains/recognition/use-cases/tag/list-tags';
import type { ListTagsResult } from '../domains/recognition/use-cases/tag/list-tags';
import { recolourTag } from '../domains/recognition/use-cases/tag/recolour-tag';
import type { RecolourTagResult } from '../domains/recognition/use-cases/tag/recolour-tag';
import { removeTagFromCapture } from '../domains/recognition/use-cases/tag/remove-tag-from-capture';
import type { RemoveTagFromCaptureResult } from '../domains/recognition/use-cases/tag/remove-tag-from-capture';
import { removeUnreadableTags } from '../domains/recognition/use-cases/tag/remove-unreadable-tags';
import type { RemoveUnreadableTagsResult } from '../domains/recognition/use-cases/tag/remove-unreadable-tags';
import { renameTag } from '../domains/recognition/use-cases/tag/rename-tag';
import type { RenameTagResult } from '../domains/recognition/use-cases/tag/rename-tag';

type TagUseCases = {
  readonly listTags: () => Promise<ListTagsResult>;
  readonly createTag: (id: TagId, name: string) => Promise<CreateTagResult>;
  readonly addTagToCapture: (capture: Capture, tag: TagId) => Promise<AddTagToCaptureResult>;
  readonly removeTagFromCapture: (
    capture: Capture,
    tag: TagId,
  ) => Promise<RemoveTagFromCaptureResult>;
  readonly renameTag: (tag: Tag, name: string) => Promise<RenameTagResult>;
  readonly recolourTag: (tag: Tag, colour: TagColour) => Promise<RecolourTagResult>;
  readonly deleteTag: (tag: TagId) => Promise<DeleteTagResult>;
  readonly removeUnreadableTags: (tags: readonly TagId[]) => Promise<RemoveUnreadableTagsResult>;
};

function buildTags(captures: CaptureRepository): TagUseCases {
  const tags = createTagRepository();

  return {
    listTags: () => listTags({ tags }),
    createTag: (id: TagId, name: string) => createTag({ tags, now: Date.now }, id, name),
    addTagToCapture: (capture: Capture, tag: TagId) => addTagToCapture({ captures }, capture, tag),
    removeTagFromCapture: (capture: Capture, tag: TagId) =>
      removeTagFromCapture({ captures }, capture, tag),
    renameTag: (tag: Tag, name: string) => renameTag({ tags }, tag, name),
    recolourTag: (tag: Tag, colour: TagColour) => recolourTag({ tags }, tag, colour),
    deleteTag: (tag: TagId) => deleteTag({ tags, captures }, tag),
    removeUnreadableTags: (ids: readonly TagId[]) => removeUnreadableTags({ tags, captures }, ids),
  };
}

export { buildTags };
export type { TagUseCases };
