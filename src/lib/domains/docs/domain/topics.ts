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
    slug: 'security-headers',
    title: 'Security headers',
    summary: 'CSP, COOP and COEP, cross-origin isolation, and why SharedArrayBuffer needs them.',
    status: 'published',
  },
  {
    slug: 'ocr',
    title: 'How OCR works',
    summary: 'Text recognition in general, then in Dokseo.',
    status: 'planned',
  },
  {
    slug: 'ui-library',
    title: 'The UI library',
    summary:
      'Layered CSS, design tokens, base components, themes and color schemes, scoped domain stylesheets and the playground.',
    status: 'planned',
  },
  {
    slug: 'offline',
    title: 'Offline and the PWA',
    summary: 'How Dokseo opens and reads without a network.',
    status: 'planned',
  },
  {
    slug: 'storage',
    title: 'Storage that lasts',
    summary: 'IndexedDB, OPFS, eviction and the persistence grant.',
    status: 'planned',
  },
  {
    slug: 'epub-rendering',
    title: 'EPUB rendering',
    summary: 'foliate-js, blob frames, CFI locations, the turn lock and vertical text.',
    status: 'planned',
  },
  {
    slug: 'book-identity',
    title: 'Book identity and recovery',
    summary: 'Partial MD5, matching a file to a book, and removed books.',
    status: 'planned',
  },
  {
    slug: 'export-import',
    title: 'Export and import',
    summary: 'The format, ids across devices, conflicts and Web Share.',
    status: 'planned',
  },
  {
    slug: 'touch-and-pointers',
    title: 'Touch and pointers',
    summary: 'Tap zones, swipes, the Apple Pencil on iPad and any-pointer.',
    status: 'planned',
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    summary: 'Ports and adapters, the domain graph, named unions and queries.',
    status: 'planned',
  },
  {
    slug: 'rendering-pages',
    title: 'Rendering pages',
    summary: 'PDF.js scale, ImageBitmaps, object URLs and memory.',
    status: 'planned',
  },
  {
    slug: 'releases-and-ci',
    title: 'Releases and CI',
    summary: 'How a change becomes a release.',
    status: 'planned',
  },
  {
    slug: 'testing',
    title: 'Testing strategy',
    summary: 'Unit tests by default, and when a browser test earns its place.',
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
