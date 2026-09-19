import type { SourceKind } from './book';
import { isImageEntry } from './image-entries';

function extensionOf(name: string): string {
	const cut = name.lastIndexOf('/');
	const last = cut === -1 ? name : name.slice(cut + 1);
	const dot = last.lastIndexOf('.');
	if (dot < 1) return '';
	return last.slice(dot + 1).toLowerCase();
}

export function detectSourceKind(names: readonly string[]): SourceKind | null {
	if (names.length === 1) {
		const only = extensionOf(names[0]);
		if (only === 'pdf') return 'pdf';
		if (only === 'zip' || only === 'cbz') return 'archive';
	}
	if (names.some(isImageEntry)) return 'images';
	return null;
}
