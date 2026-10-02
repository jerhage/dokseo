type Titled = { readonly title: string; readonly alias: string | null };

function shownTitle(book: Titled): string {
  return book.alias ?? book.title;
}

function aliasFor(title: string, typed: string): string | null {
  const trimmed = typed.trim();
  return trimmed.length === 0 || trimmed === title ? null : trimmed;
}

export { aliasFor, shownTitle };
export type { Titled };
