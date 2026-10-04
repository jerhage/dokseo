import { match } from 'ts-pattern';

type JoinBook = { readonly id: string; readonly title: string };

type JoinCapture = { readonly id: number; readonly bookId: string; readonly page: number };

type JoinReader = {
  books(): Promise<readonly JoinBook[]>;
  captures(): Promise<readonly JoinCapture[]>;
  capturesOf(bookId: string): Promise<readonly JoinCapture[]>;
  book(id: string): Promise<JoinBook | undefined>;
};

type JoinStrategy = 'captures-per-book' | 'book-per-capture' | 'two-scans';

type JoinedBook = {
  readonly bookId: string;
  readonly title: string;
  readonly pages: readonly number[];
};

type JoinOutcome = { readonly books: readonly JoinedBook[]; readonly requests: number };

type JoinSeed = { readonly books: readonly JoinBook[]; readonly captures: readonly JoinCapture[] };

const JOIN_STRATEGIES: readonly JoinStrategy[] = [
  'captures-per-book',
  'book-per-capture',
  'two-scans',
];

function countingReader(reader: JoinReader): { reader: JoinReader; requests: () => number } {
  let requests = 0;
  const counted =
    <A extends unknown[], R>(call: (...args: A) => Promise<R>) =>
    (...args: A): Promise<R> => {
      requests += 1;
      return call(...args);
    };
  return {
    reader: {
      books: counted(() => reader.books()),
      captures: counted(() => reader.captures()),
      capturesOf: counted((bookId: string) => reader.capturesOf(bookId)),
      book: counted((id: string) => reader.book(id)),
    },
    requests: () => requests,
  };
}

function pagesOf(captures: readonly JoinCapture[]): readonly number[] {
  return captures.map((capture) => capture.page).toSorted((a, b) => a - b);
}

function byBookId(books: readonly JoinedBook[]): readonly JoinedBook[] {
  return books.toSorted((a, b) => (a.bookId < b.bookId ? -1 : a.bookId > b.bookId ? 1 : 0));
}

function grouped(captures: readonly JoinCapture[]): ReadonlyMap<string, JoinCapture[]> {
  const groups = new Map<string, JoinCapture[]>();
  for (const capture of captures) {
    const group = groups.get(capture.bookId);
    if (group === undefined) groups.set(capture.bookId, [capture]);
    else group.push(capture);
  }
  return groups;
}

async function capturesPerBook(reader: JoinReader): Promise<readonly JoinedBook[]> {
  const books = await reader.books();
  const joined = await Promise.all(
    books.map(async (book) => ({ book, captures: await reader.capturesOf(book.id) })),
  );
  return joined
    .filter((pair) => pair.captures.length > 0)
    .map((pair) => ({
      bookId: pair.book.id,
      title: pair.book.title,
      pages: pagesOf(pair.captures),
    }));
}

async function bookPerCapture(reader: JoinReader): Promise<readonly JoinedBook[]> {
  const captures = await reader.captures();
  const owners = await Promise.all(captures.map((capture) => reader.book(capture.bookId)));
  const titles = new Map<string, string>();
  owners.forEach((owner) => {
    if (owner !== undefined) titles.set(owner.id, owner.title);
  });
  return [...grouped(captures)].flatMap(([bookId, held]) => {
    const title = titles.get(bookId);
    return title === undefined ? [] : [{ bookId, title, pages: pagesOf(held) }];
  });
}

async function twoScans(reader: JoinReader): Promise<readonly JoinedBook[]> {
  const [books, captures] = await Promise.all([reader.books(), reader.captures()]);
  const groups = grouped(captures);
  return books.flatMap((book) => {
    const held = groups.get(book.id);
    return held === undefined ? [] : [{ bookId: book.id, title: book.title, pages: pagesOf(held) }];
  });
}

async function joinWith(strategy: JoinStrategy, source: JoinReader): Promise<JoinOutcome> {
  const { reader, requests } = countingReader(source);
  const books = await match(strategy)
    .with('captures-per-book', () => capturesPerBook(reader))
    .with('book-per-capture', () => bookPerCapture(reader))
    .with('two-scans', () => twoScans(reader))
    .exhaustive();
  return { books: byBookId(books), requests: requests() };
}

function expectedRequests(strategy: JoinStrategy, books: number, captures: number): number {
  return match(strategy)
    .with('captures-per-book', () => 1 + books)
    .with('book-per-capture', () => 1 + captures)
    .with('two-scans', () => 2)
    .exhaustive();
}

function joinSeed(bookCount: number, capturesPerBookCount: number): JoinSeed {
  const books = Array.from({ length: bookCount }, (_, index) => ({
    id: `book-${String(index + 1).padStart(3, '0')}`,
    title: `Volume ${index + 1}`,
  }));
  const captures = Array.from({ length: bookCount * capturesPerBookCount }, (_, index) => {
    const book = books[index % bookCount];
    return {
      id: index + 1,
      bookId: book === undefined ? 'book-000' : book.id,
      page: Math.floor(index / bookCount) + 1,
    };
  });
  return { books, captures };
}

export { JOIN_STRATEGIES, countingReader, expectedRequests, joinSeed, joinWith };
export type { JoinBook, JoinCapture, JoinOutcome, JoinReader, JoinSeed, JoinStrategy, JoinedBook };
