type Page<Item, Cursor> = {
  readonly items: readonly Item[];
  readonly next: Cursor | null;
};

function itemsOf<Item, Cursor>(pages: readonly Page<Item, Cursor>[]): readonly Item[] {
  return pages.flatMap((page) => page.items);
}

export { itemsOf };
export type { Page };
