import { match } from 'ts-pattern';
import type { RemoteItem } from '../domain/remote-item';
import type { QueuedDownload } from './catalog-downloads.svelte';

type ListedPublication = QueuedDownload & { readonly item: RemoteItem };

function isSelectable(item: RemoteItem): boolean {
  return match(item)
    .returnType<boolean>()
    .with({ kind: 'remote' }, { kind: 'download-failed' }, () => true)
    .with(
      { kind: 'unsupported' },
      { kind: 'downloading' },
      { kind: 'held' },
      { kind: 'held-older' },
      () => false,
    )
    .exhaustive();
}

function selectableOf(listed: readonly ListedPublication[]): readonly ListedPublication[] {
  return listed.filter(({ item }) => isSelectable(item));
}

function chosenOf(
  listed: readonly ListedPublication[],
  chosen: ReadonlySet<string>,
): readonly ListedPublication[] {
  return selectableOf(listed).filter(({ publication }) => chosen.has(publication.entryId));
}

function entryIdsOf(listed: readonly ListedPublication[]): readonly string[] {
  return listed.map(({ publication }) => publication.entryId);
}

export { chosenOf, entryIdsOf, isSelectable, selectableOf };
export type { ListedPublication };
