type PostSample = {
  readonly name: string;
  readonly code: string;
  readonly expected: 'clones' | 'throws';
  readonly arrives: string | null;
  readonly needsDocument: boolean;
  make(): unknown;
};

class Page {
  number: number;

  constructor(number: number) {
    this.number = number;
  }

  label(): string {
    return `Page ${this.number}`;
  }
}

function cyclicBook(): unknown {
  const book: Record<string, unknown> = { title: '本' };
  book.self = book;
  return book;
}

function sample(
  name: string,
  code: string,
  make: () => unknown,
  arrives: string | null,
  needsDocument = false,
): PostSample {
  return {
    name,
    code,
    make,
    arrives,
    expected: arrives === null ? 'throws' : 'clones',
    needsDocument,
  };
}

const POST_SAMPLES: readonly PostSample[] = [
  sample(
    'A plain object',
    `{ title: '本', pages: 200 }`,
    () => ({ title: '本', pages: 200 }),
    'plain object { title: string, pages: number }',
  ),
  sample(
    'A Date',
    `new Date('2026-10-04T00:00:00Z')`,
    () => new Date('2026-10-04T00:00:00Z'),
    'Date 2026-10-04T00:00:00.000Z',
  ),
  sample(
    'A Map',
    `new Map([['ja', 'manga-ocr']])`,
    () => new Map([['ja', 'manga-ocr']]),
    'Map with 1 entry',
  ),
  sample('A class instance', `new Page(3)`, () => new Page(3), 'plain object { number: number }'),
  sample(
    'An object with a getter',
    `{ get pages() { return 200; } }`,
    () => ({
      get pages(): number {
        return 200;
      },
    }),
    'plain object { pages: number }',
  ),
  sample(
    'An object that holds itself',
    `book.self = book`,
    cyclicBook,
    'plain object { title: string, self: itself }',
  ),
  sample(
    'A TypeError',
    `new TypeError('bad page')`,
    () => new TypeError('bad page'),
    'TypeError: bad page',
  ),
  sample(
    'A Blob',
    `new Blob(['本'], { type: 'text/plain' })`,
    () => new Blob(['本'], { type: 'text/plain' }),
    'Blob of 3 bytes, type "text/plain"',
  ),
  sample('A function', `() => 1`, () => () => 1, null),
  sample(
    'An object with a method',
    `{ title: '本', open: () => undefined }`,
    () => ({ title: '本', open: () => undefined }),
    null,
  ),
  sample('A symbol', `Symbol('id')`, () => Symbol('id'), null),
  sample('A proxy', `new Proxy({ title: '本' }, {})`, () => new Proxy({ title: '本' }, {}), null),
  sample('A WeakMap', `new WeakMap()`, () => new WeakMap(), null),
  sample(
    'A DOM element',
    `document.createElement('p')`,
    () => document.createElement('p'),
    null,
    true,
  ),
];

export { POST_SAMPLES, Page };
export type { PostSample };
