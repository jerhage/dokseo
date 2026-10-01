import { mutationOptions, queryOptions } from '@tanstack/svelte-query';
import type { TagId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Capture } from '../domain/capture/capture';
import type { CaptureError } from '../domain/capture/capture-repository';
import type { Tag } from '../domain/tag/tag';
import type { TagColour } from '../domain/tag/tag-colour';
import type { TagError } from '../domain/tag/tag-repository';
import type { CreateTagError } from '../use-cases/tag/create-tag';
import type { RenameTagError } from '../use-cases/tag/rename-tag';
import { recognitionKeys } from './recognition-keys';
import { storeRead } from './store-read';

type TagReads = {
  readonly listTags: () => Promise<Result<readonly Tag[], TagError>>;
};

type TagWrites = {
  readonly createTag: (id: TagId, name: string) => Promise<Result<Tag, CreateTagError>>;
  readonly addTagToCapture: (
    capture: Capture,
    tag: TagId,
  ) => Promise<Result<Capture, CaptureError>>;
  readonly removeTagFromCapture: (
    capture: Capture,
    tag: TagId,
  ) => Promise<Result<Capture, CaptureError>>;
  readonly renameTag: (tag: Tag, name: string) => Promise<Result<Tag, RenameTagError>>;
  readonly recolourTag: (tag: Tag, colour: TagColour) => Promise<Result<Tag, TagError>>;
  readonly deleteTag: (tag: TagId) => Promise<Result<number, TagError | CaptureError>>;
};

type NewTag = { readonly id: TagId; readonly name: string };

type CaptureTagging = { readonly capture: Capture; readonly tag: TagId };

type TagRename = { readonly tag: Tag; readonly name: string };

type TagRecolour = { readonly tag: Tag; readonly colour: TagColour };

function tagsQuery(recognition: TagReads) {
  return queryOptions({
    queryKey: recognitionKeys.tags(),
    queryFn: async () => {
      const listed = await recognition.listTags();
      return storeRead(listed);
    },
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

export {
  addTagMutation,
  createTagMutation,
  deleteTagMutation,
  recolourTagMutation,
  removeTagMutation,
  renameTagMutation,
  tagsQuery,
};
export type { CaptureTagging, NewTag, TagReads, TagRecolour, TagRename, TagWrites };
