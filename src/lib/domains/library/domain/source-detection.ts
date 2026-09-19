import type { SourceKind } from './book';
import { extensionOf } from './entry-path';
import { isImageEntry } from './image-entries';

export function detectSourceKind(names: readonly string[]): SourceKind | null {
	if (names.length === 1) {
		const only = extensionOf(names[0]);
		if (only === 'pdf') return 'pdf';
		if (only === 'zip' || only === 'cbz') return 'archive';
	}
	if (names.some(isImageEntry)) return 'images';
	return null;
}
