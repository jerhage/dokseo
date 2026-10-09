import type { RemoteItem } from '../domain/remote-item';
import type { RemotePublication } from '../domain/remote-publication';
import { publicationFacts, summaryLines } from './publication-facts';
import type { PublicationFact } from './publication-facts';
import type { ListedPublication } from './selection-rules';

type OpenedPublication = {
  readonly publication: RemotePublication;
  readonly item: RemoteItem;
  readonly cover: string | null;
  readonly facts: readonly PublicationFact[];
  readonly summary: readonly string[];
};

function openedPublication(
  listed: readonly ListedPublication[],
  entryId: string | null,
  cover: (entryId: string) => string | null,
): OpenedPublication | null {
  if (entryId === null) return null;
  const found = listed.find(({ publication }) => publication.entryId === entryId);
  if (found === undefined) return null;
  const { publication, item } = found;
  return {
    publication,
    item,
    cover: cover(publication.entryId),
    facts: publicationFacts(publication),
    summary: summaryLines(publication.summary),
  };
}

export { openedPublication };
export type { OpenedPublication };
