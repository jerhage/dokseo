import { mutationOptions, queryOptions } from '@tanstack/svelte-query';
import type { TagId } from '$lib/shared/ids';
import type { Capture } from '../domain/capture/capture';
import type { Tag } from '../domain/tag/tag';
import type { TagColour } from '../domain/tag/tag-colour';
import type { AddTagToCaptureResult } from '../use-cases/tag/add-tag-to-capture';
import type { CreateTagResult } from '../use-cases/tag/create-tag';
import type { DeleteTagResult } from '../use-cases/tag/delete-tag';
import type { ListTagsResult } from '../use-cases/tag/list-tags';
import type { RecolourTagResult } from '../use-cases/tag/recolour-tag';
import type { RemoveTagFromCaptureResult } from '../use-cases/tag/remove-tag-from-capture';
import type { RemoveUnreadableTagsResult } from '../use-cases/tag/remove-unreadable-tags';
import type { RenameTagResult } from '../use-cases/tag/rename-tag';
import { recognitionKeys } from './recognition-keys';

type TagReads = {
  readonly listTags: () => Promise<ListTagsResult>;
};

type TagWrites = {
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

type NewTag = { readonly id: TagId; readonly name: string };

type CaptureTagging = { readonly capture: Capture; readonly tag: TagId };

type TagRename = { readonly tag: Tag; readonly name: string };

type TagRecolour = { readonly tag: Tag; readonly colour: TagColour };

function tagsQuery(recognition: TagReads) {
  return queryOptions({
    queryKey: recognitionKeys.tags(),
    queryFn: () => recognition.listTags(),
    staleTime: 0,
  });
}

function createTagMutation(recognition: Pick<TagWrites, 'createTag'>) {
  return mutationOptions({
    mutationFn: ({ id, name }: NewTag) => recognition.createTag(id, name),
  });
}

function addTagMutation(recognition: Pick<TagWrites, 'addTagToCapture'>) {
  return mutationOptions({
    mutationFn: ({ capture, tag }: CaptureTagging) => recognition.addTagToCapture(capture, tag),
  });
}

function removeTagMutation(recognition: Pick<TagWrites, 'removeTagFromCapture'>) {
  return mutationOptions({
    mutationFn: ({ capture, tag }: CaptureTagging) =>
      recognition.removeTagFromCapture(capture, tag),
  });
}

function renameTagMutation(recognition: Pick<TagWrites, 'renameTag'>) {
  return mutationOptions({
    mutationFn: ({ tag, name }: TagRename) => recognition.renameTag(tag, name),
  });
}

function recolourTagMutation(recognition: Pick<TagWrites, 'recolourTag'>) {
  return mutationOptions({
    mutationFn: ({ tag, colour }: TagRecolour) => recognition.recolourTag(tag, colour),
  });
}

function deleteTagMutation(recognition: Pick<TagWrites, 'deleteTag'>) {
  return mutationOptions({
    mutationFn: (tag: TagId) => recognition.deleteTag(tag),
  });
}

function removeUnreadableTagsMutation(recognition: Pick<TagWrites, 'removeUnreadableTags'>) {
  return mutationOptions({
    mutationFn: (ids: readonly TagId[]) => recognition.removeUnreadableTags(ids),
  });
}

export {
  addTagMutation,
  createTagMutation,
  deleteTagMutation,
  recolourTagMutation,
  removeTagMutation,
  removeUnreadableTagsMutation,
  renameTagMutation,
  tagsQuery,
};
export type { CaptureTagging, NewTag, TagReads, TagRecolour, TagRename, TagWrites };
