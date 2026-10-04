import { match } from 'ts-pattern';
import { namedTag, tagName } from '$lib/domains/recognition/domain/tag/tag';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import type { TagListing, TagRepository } from '$lib/domains/recognition/domain/tag/tag-repository';
import { renameTag } from '$lib/domains/recognition/use-cases/tag/rename-tag';
import type { RenameTagResult } from '$lib/domains/recognition/use-cases/tag/rename-tag';
import { tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { unexpectedMessage } from '$lib/shared/unexpected-failure';

type StoreMode = 'working' | 'blocked' | 'throws';

type PortCall = { readonly call: string; readonly result: string };

type Rehearsal =
  | { readonly kind: 'stopped' }
  | {
      readonly kind: 'resolved';
      readonly result: RenameTagResult;
      readonly calls: readonly PortCall[];
      readonly held: readonly Tag[];
    }
  | { readonly kind: 'rejected'; readonly message: string; readonly calls: readonly PortCall[] };

type RenameArm = 'nameless' | 'success' | 'name-taken' | 'storage-unavailable' | 'thrown';

const STORE_FAILURE = 'The demo store failed while reading tags';

const CREATED_AT = 0;

const GRAMMAR_TAG = namedTag(tagId('tag-grammar'), 'Grammar', 'rose', CREATED_AT);

const HELD_TAGS: readonly Tag[] = [
  GRAMMAR_TAG,
  namedTag(tagId('tag-names'), 'Names', 'sky', CREATED_AT),
  namedTag(tagId('tag-vocabulary'), 'Vocabulary', 'fern', CREATED_AT),
];

function namesOf(tags: readonly Tag[]): string {
  return tags.map((tag) => tag.name).join(', ');
}

function fakeTags(held: Tag[], mode: StoreMode, calls: PortCall[]): TagRepository {
  return {
    list(): Promise<TagListing> {
      return match(mode)
        .with('working', () => {
          calls.push({ call: 'list()', result: `success: ${namesOf(held)}` });
          return Promise.resolve<TagListing>({ kind: 'success', tags: [...held], unreadable: [] });
        })
        .with('blocked', () => {
          calls.push({ call: 'list()', result: 'storage-unavailable' });
          return Promise.resolve<TagListing>(STORAGE_UNAVAILABLE);
        })
        .with('throws', () => {
          calls.push({ call: 'list()', result: 'a rejected promise' });
          return Promise.reject<TagListing>(new Error(STORE_FAILURE));
        })
        .exhaustive();
    },
    save(tag) {
      const index = held.findIndex((other) => other.id === tag.id);
      if (index === -1) held.push(tag);
      else held[index] = tag;
      calls.push({ call: `save(${tag.name})`, result: 'success' });
      return Promise.resolve({ kind: 'success' });
    },
    remove() {
      calls.push({ call: 'remove()', result: 'success' });
      return Promise.resolve({ kind: 'success' });
    },
  };
}

async function rehearseRename(
  held: readonly Tag[],
  tag: Tag,
  draft: string,
  mode: StoreMode,
): Promise<Rehearsal> {
  if (tagName(draft).length === 0) return { kind: 'stopped' };

  const calls: PortCall[] = [];
  const stored = [...held];
  try {
    const result = await renameTag({ tags: fakeTags(stored, mode, calls) }, tag, draft);
    return { kind: 'resolved', result, calls, held: stored };
  } catch (cause) {
    return { kind: 'rejected', message: unexpectedMessage(cause), calls };
  }
}

function renameArm(rehearsal: Rehearsal): RenameArm {
  return match(rehearsal)
    .with({ kind: 'stopped' }, (): RenameArm => 'nameless')
    .with({ kind: 'rejected' }, (): RenameArm => 'thrown')
    .with({ kind: 'resolved' }, ({ result }) => result.kind)
    .exhaustive();
}

export { GRAMMAR_TAG, HELD_TAGS, STORE_FAILURE, rehearseRename, renameArm };
export type { PortCall, Rehearsal, RenameArm, StoreMode };
