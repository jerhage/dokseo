import { withoutExtension } from './entry-path';

export type TitleCandidate = { readonly name: string; readonly path: string };

const FALLBACK_TITLE = 'Untitled';

function firstNonEmpty(...candidates: readonly string[]): string {
	for (const candidate of candidates) {
		const trimmed = candidate.trim();
		if (trimmed.length > 0) return trimmed;
	}
	return FALLBACK_TITLE;
}

export function suggestTitle(entries: readonly TitleCandidate[]): string {
	const first = entries[0];
	if (first === undefined) return FALLBACK_TITLE;
	const [folder = ''] = first.path.split('/');
	return firstNonEmpty(folder, withoutExtension(first.name));
}
