type DocsTopicStatus = 'published' | 'planned';

type DocsTopic = {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly status: DocsTopicStatus;
};

type DocsIndexEntry =
  | { readonly kind: 'link'; readonly topic: DocsTopic; readonly href: string }
  | { readonly kind: 'coming'; readonly topic: DocsTopic };

const DOCS_ROOT = '/docs';

const DOCS_TOPICS = [
  {
    slug: 'ui-library',
    title: 'The UI library',
    summary:
      'Layered CSS, design tokens, base components, themes and color schemes, scoped domain stylesheets and the playground.',
    status: 'published',
  },
  {
    slug: 'security-headers',
    title: 'Security headers',
    summary:
      'CSP, COOP and COEP, cross-origin isolation, and how Dokseo runs threaded OCR and EPUB frames under them.',
    status: 'published',
  },
  {
    slug: 'ocr',
    title: 'How OCR works',
    summary:
      'Detection and recognition, encoder and decoder, model tokens and greedy decoding, then how Dokseo runs manga-ocr and PaddleOCR in a browser worker.',
    status: 'published',
  },
  {
    slug: 'offline',
    title: 'Offline and the PWA',
    summary:
      'Service workers, the Cache API, cache strategies, installing, and how an open app finds and applies an update.',
    status: 'published',
  },
  {
    slug: 'storage',
    title: 'Storage that lasts',
    summary:
      'localStorage, IndexedDB, the Cache API and OPFS, quotas and eviction, the persistence grant, and where Dokseo keeps each kind of data.',
    status: 'published',
  },
  {
    slug: 'epub-rendering',
    title: 'EPUB rendering',
    summary: 'foliate-js, blob frames, CFI locations, the turn lock and vertical text.',
    status: 'published',
  },
  {
    slug: 'book-identity',
    title: 'Book identity and recovery',
    summary:
      'Hashing by content or by sample, KOReader’s partial MD5, matching an upload to a book, and recovering removed and unreadable books.',
    status: 'published',
  },
  {
    slug: 'export-import',
    title: 'Export and import',
    summary:
      'Local and global ids, a versioned file read entry by entry, merging and conflicts, and saving through the share sheet or a download.',
    status: 'published',
  },
  {
    slug: 'touch-and-pointers',
    title: 'Touch and pointers',
    summary:
      'Pointer events, touch-action, telling a tap from a swipe, pointer media queries and the Apple Pencil on iPad, then Dokseo’s tap zones, edge clicks and selections.',
    status: 'published',
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    summary:
      'Ports and adapters, the composition root, use cases, the acyclic domain graph and the rules that enforce it, named unions and queries.',
    status: 'published',
  },
  {
    slug: 'rendering-pages',
    title: 'Rendering pages',
    summary:
      'Decoding, img or canvas, object URLs, render scale, pdf.js and ZIP reading, iOS canvas limits, and how Dokseo pairs, windows and releases its pages.',
    status: 'published',
  },
  {
    slug: 'releases-and-ci',
    title: 'Releases and CI',
    summary:
      'Semantic versions, Conventional Commits, release pull requests and CI, then how Dokseo releases with release-please and GitHub Actions and deploys to Cloudflare Workers.',
    status: 'published',
  },
  {
    slug: 'testing',
    title: 'Testing strategy',
    summary:
      'Unit, browser and end-to-end tests, fakes and mocks, regression, mutation and drift tests, then Vitest’s two projects, the verify ladder and probes in Dokseo.',
    status: 'published',
  },
  {
    slug: 'sql-set-theory',
    title: 'SQL as set theory',
    summary:
      'Relations as sets, and each SQL operator as a set operation: selection, projection, joins, semi-joins, anti-joins, union, intersection, difference and grouping.',
    status: 'planned',
  },
  {
    slug: 'sql-patterns',
    title: 'SQL patterns',
    summary:
      'If you want this, write that: N+1 and how to avoid it, projections, existence checks, rows with no match, conditional aggregation and window functions.',
    status: 'planned',
  },
  {
    slug: 'unicode',
    title: 'Unicode and Japanese text',
    summary:
      'Code points, UTF-16 and graphemes, normalization, vertical writing and ruby, and how Dokseo handles Japanese text.',
    status: 'planned',
  },
  {
    slug: 'workers',
    title: 'Workers and data transfer',
    summary:
      'Dedicated workers, cloning and transferring data, SharedArrayBuffer and Atomics, and how Dokseo uses workers.',
    status: 'planned',
  },
  {
    slug: 'typescript-types',
    title: 'TypeScript type design',
    summary:
      'Discriminated unions, exhaustive matching, brands, and solving a type problem by construction instead of with a cast.',
    status: 'planned',
  },
  {
    slug: 'async-correctness',
    title: 'Async correctness',
    summary:
      'Races and stale answers, cancellation, promises that never settle, and the patterns Dokseo uses against them.',
    status: 'planned',
  },
  {
    slug: 'indexeddb',
    title: 'IndexedDB as a database',
    summary:
      'Stores, keys and indexes, transactions, version upgrades, and joining data in code because IndexedDB has no joins.',
    status: 'planned',
  },
  {
    slug: 'accessibility',
    title: 'Accessibility in a reader',
    summary:
      'Focus, keyboard paging, modals and focus traps, roles and live regions, applied to Dokseo.',
    status: 'planned',
  },
] as const satisfies readonly DocsTopic[];

type DocsTopicSlug = (typeof DOCS_TOPICS)[number]['slug'];

function docsTopicHref(slug: string): string {
  return `${DOCS_ROOT}/${slug}`;
}

function docsTopic(slug: DocsTopicSlug): DocsTopic {
  const topic = DOCS_TOPICS.find((candidate) => candidate.slug === slug);
  if (topic === undefined) throw new Error(`No docs topic is named ${slug}`);
  return topic;
}

function docsIndexEntries(topics: readonly DocsTopic[]): readonly DocsIndexEntry[] {
  return topics.map((topic) =>
    topic.status === 'published'
      ? { kind: 'link', topic, href: docsTopicHref(topic.slug) }
      : { kind: 'coming', topic },
  );
}

export { DOCS_ROOT, DOCS_TOPICS, docsIndexEntries, docsTopic, docsTopicHref };
export type { DocsIndexEntry, DocsTopic, DocsTopicSlug, DocsTopicStatus };
