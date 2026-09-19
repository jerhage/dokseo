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

export type BookEdit = {
  readonly title?: string;
  readonly language?: Language;
  readonly layoutKind?: LayoutKind;
  readonly direction?: ReadingDirection;
  readonly position?: ImageIndex;
};

function editedTitle(book: Book, edit: BookEdit): string {
  if (edit.title === undefined) return book.title;
  const trimmed = edit.title.trim();
  return trimmed.length === 0 ? book.title : trimmed;
}

export function applyEdit(book: Book, edit: BookEdit): Book {
  const layoutKind = edit.layoutKind ?? book.layoutKind;
  const direction = layoutKind === 'continuous' ? 'ltr' : (edit.direction ?? book.direction);
  return {
    ...book,
    title: editedTitle(book, edit),
    language: edit.language ?? book.language,
    layoutKind,
    direction,
    position: edit.position ?? book.position,
  };
}
