import type { TagId } from '$lib/shared/ids';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';
import { untaggedCapture } from '../../domain/tag/capture-tags';
import type { TagError, TagRepository } from '../../domain/tag/tag-repository';

type DeleteTagDeps = {
  readonly tags: TagRepository;
  readonly captures: CaptureRepository;
};

async function deleteTag(
  deps: DeleteTagDeps,
  tag: TagId,
): Promise<Result<number, TagError | CaptureError>> {
  const everything = await deps.captures.listEverything();
  if (!everything.ok) return everything;

  const carrying = everything.value.filter((capture) => capture.tagIds.includes(tag));

  for (const capture of carrying) {
    const stored = await deps.captures.save(untaggedCapture(capture, tag));
    if (!stored.ok) return stored;
  }

  const removed = await deps.tags.remove(tag);
  if (!removed.ok) return removed;

  return ok(carrying.length);
}

export { deleteTag };
export type { DeleteTagDeps };
