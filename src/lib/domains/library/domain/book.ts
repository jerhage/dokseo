import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { LayoutKind, ReadingDirection } from '$lib/shared/layout-kind';

export type SourceKind = 'images' | 'pdf' | 'archive';

export const SOURCE_KINDS: readonly SourceKind[] = ['images', 'pdf', 'archive'];

export function isSourceKind(v: unknown): v is SourceKind {
	return typeof v === 'string' && (SOURCE_KINDS as readonly string[]).includes(v);
}

export type Book = {
	readonly id: BookId;
	readonly title: string;
	readonly language: Language;
	readonly layoutKind: LayoutKind;
	readonly direction: ReadingDirection;
	readonly sourceKind: SourceKind;
	readonly imageCount: number;
	readonly addedAt: number;
	readonly position: ImageIndex;
};

export function withPosition(book: Book, at: ImageIndex): Book {
	return { ...book, position: at };
}
