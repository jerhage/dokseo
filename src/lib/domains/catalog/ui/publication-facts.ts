import { languageName } from '$lib/shared/language';
import { formatFileSize } from '$lib/ui/components/file-selection';
import type { RemotePublication } from '../domain/remote-publication';

type PublicationFact = { readonly label: string; readonly value: string };

const DATES = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function updatedText(updated: string): string | null {
  const time = Date.parse(updated);
  return Number.isNaN(time) ? null : DATES.format(time);
}

function publicationFacts(publication: RemotePublication): readonly PublicationFact[] {
  const { authors, language, acquisition, updated } = publication;
  const date = updatedText(updated);
  const length = acquisition?.length ?? null;
  const facts: (PublicationFact | null)[] = [
    authors.length === 0 ? null : { label: 'Authors', value: authors.join(', ') },
    language === null ? null : { label: 'Language', value: languageName(language) },
    acquisition === null ? null : { label: 'Format', value: acquisition.format.toUpperCase() },
    length === null ? null : { label: 'Size', value: formatFileSize(length) },
    date === null ? null : { label: 'Updated', value: date },
  ];
  return facts.filter((fact) => fact !== null);
}

function summaryLines(summary: string): readonly string[] {
  return summary.split('\n').filter((line) => line !== '');
}

export { publicationFacts, summaryLines };
export type { PublicationFact };
