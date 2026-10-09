import { match } from 'ts-pattern';
import type { Tag } from '../../domain/tag/tag';
import type { CreateTagResult } from '../../use-cases/tag/create-tag';
import type { StorageFailure } from './storage-failure';

type TagOutcome =
  | { readonly kind: 'created'; readonly tag: Tag }
  | { readonly kind: 'existing'; readonly tag: Tag }
  | { readonly kind: 'failed'; readonly failure: StorageFailure };

function tagOutcome(created: CreateTagResult): TagOutcome {
  return match(created)
    .returnType<TagOutcome>()
    .with({ kind: 'success' }, ({ tag }) => ({ kind: 'created', tag }))
    .with({ kind: 'name-taken' }, ({ tag }) => ({ kind: 'existing', tag }))
    .with({ kind: 'storage-unavailable' }, (failure) => ({ kind: 'failed', failure }))
    .exhaustive();
}

export { tagOutcome };
export type { TagOutcome };
