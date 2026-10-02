import type { SourceKind } from './book';
import { withoutExtension } from '../ingest/entry-path';

type TitleCandidate = { readonly name: string; readonly path: string };

const FALLBACK_TITLE = 'Untitled';

function firstNonEmpty(...candidates: readonly string[]): string {
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return FALLBACK_TITLE;
}

function suggestTitle(sourceKind: SourceKind, entries: readonly TitleCandidate[]): string {
  const first = entries[0];
  if (first === undefined) return FALLBACK_TITLE;
  if (sourceKind !== 'images') return firstNonEmpty(withoutExtension(first.name));
  const [folder = ''] = first.path.split('/');
  return firstNonEmpty(folder, withoutExtension(first.name));
}

function bookTitle(metadataTitle: string | null, fileTitle: string): string {
  const declared = metadataTitle?.trim() ?? '';
  return declared.length > 0 ? declared : fileTitle;
}

const PLACEHOLDER_TITLES: ReadonlySet<string> = new Set(['untitled', 'untitled document']);

const AUTHORING_FILE_NAME = /\.(?:docx?|pdf|indd|rtf|odt)$/i;

const FILE_PATH = /^(?:[a-z]:[\\/]|\\\\|\/|~\/)|\\/i;

function plausibleTitle(declared: string): string | null {
  const trimmed = declared.trim();
  if (trimmed.length === 0) return null;
  if (PLACEHOLDER_TITLES.has(trimmed.toLowerCase())) return null;
  if (AUTHORING_FILE_NAME.test(trimmed) || FILE_PATH.test(trimmed)) return null;
  return trimmed;
}

export { bookTitle, plausibleTitle, suggestTitle };
export type { TitleCandidate };
