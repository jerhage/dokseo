type LabelledBook = {
  readonly title: string;
  readonly removed: boolean;
};

function bookLabel(book: LabelledBook): string {
  return book.removed ? `${book.title} (removed)` : book.title;
}

export { bookLabel };
export type { LabelledBook };
