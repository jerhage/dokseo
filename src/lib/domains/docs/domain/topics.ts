type DocsTopicStatus = 'published' | 'planned';

type DocsTopicText = {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly status: DocsTopicStatus;
};

type DocsTopic =
  | (DocsTopicText & { readonly kind: 'explainer' })
  | (DocsTopicText & { readonly kind: 'plan'; readonly buildsAfter: string });

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
    kind: 'explainer',
  },
  {
    slug: 'vendored-ui',
    title: 'A vendored UI library: Kandan UI',
    summary:
      'Vendoring against a published package, git submodule, git subtree and a copy tool, how Dokseo vendors, integrates and updates Kandan UI, and how the library was extracted from Dokseo.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'kandan-core-plan',
    title: 'A framework-free core: Kandan UI',
    summary:
      'Which parts of a component library depend on a framework, fixtures as a markup contract every framework version is tested against, native elements before scripts, the core kandan-ui-svelte vendors and Dokseo receives inside it, and how the core was built.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'security-headers',
    title: 'Security headers',
    summary:
      'CSP, COOP and COEP, cross-origin isolation, and how Dokseo runs threaded OCR and EPUB frames under them.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'ocr',
    title: 'How OCR works',
    summary:
      'Detection and recognition, encoder and decoder, model tokens and greedy decoding, then how Dokseo runs manga-ocr and PaddleOCR in a browser worker.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'offline',
    title: 'Offline and the PWA',
    summary:
      'Service workers, the Cache API, cache strategies, installing, and how an open app finds and applies an update.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'storage',
    title: 'Storage that lasts',
    summary:
      'localStorage, IndexedDB, the Cache API and OPFS, quotas and eviction, the persistence grant, and where Dokseo keeps each kind of data.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'stored-format',
    title: 'The 1.x stored format',
    summary:
      'What a stored-format promise is, strict reads and database version migrations, every record Dokseo keeps field by field, the captures file and its golden copy, and unreadable rows.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'epub-rendering',
    title: 'EPUB rendering',
    summary: 'foliate-js, blob frames, CFI locations, the turn lock and vertical text.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'triple-click-selection',
    title: 'Triple-click selections across browsers',
    summary:
      'Where Firefox, Chrome and Safari put the edges of a triple-clicked paragraph, why Firefox’s range became a collapsed CFI in Dokseo, and how Dokseo moves selection edges into text.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'book-identity',
    title: 'Book identity and recovery',
    summary:
      'Hashing by content or by sample, KOReader’s partial MD5, matching an upload to a book, and recovering removed and unreadable books.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'export-import',
    title: 'Export and import',
    summary:
      'Local and global ids, a versioned file read entry by entry, merging and conflicts, and saving through the share sheet or a download.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'touch-and-pointers',
    title: 'Touch and pointers',
    summary:
      'Pointer events, touch-action, telling a tap from a swipe, pointer media queries and the Apple Pencil on iPad, then Dokseo’s tap zones, edge clicks and selections.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    summary:
      'Ports and adapters, the composition root, use cases, the acyclic domain graph and the rules that enforce it, named unions and queries.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'rendering-pages',
    title: 'Rendering pages',
    summary:
      'Decoding, img or canvas, object URLs, render scale, pdf.js and ZIP reading, iOS canvas limits, and how Dokseo pairs, windows and releases its pages.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'releases-and-ci',
    title: 'Releases and CI',
    summary:
      'Semantic versions, Conventional Commits, release pull requests and CI, then how Dokseo releases with release-please and GitHub Actions and deploys to Cloudflare Workers.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'contributing',
    title: 'Contributing and releasing',
    summary:
      'The three repositories and the rules between them, commit types and the version they cause, and the commands for a core change, each subtree pull and a Dokseo release.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'testing',
    title: 'Testing strategy',
    summary:
      'Unit, browser and end-to-end tests, fakes and mocks, regression, mutation and drift tests, then Vitest’s two projects, the verify ladder and probes in Dokseo.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'example-drift',
    title: 'Keeping code examples from drifting',
    summary:
      'Quotes kept as data with their source path, a unit test that finds each one in its file, CI that runs it, the same idea for recorded SQL results, compiler errors and bundles, and what no check covers.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'sql-set-theory',
    title: 'SQL as set theory',
    summary:
      'Relations as sets, and each SQL operator as a set operation: selection, projection, joins, semi-joins, anti-joins, union, intersection, difference and grouping.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'sql-patterns',
    title: 'SQL patterns',
    summary:
      'If you want this, write that: N+1 and how to avoid it, projections, existence checks, rows with no match, conditional aggregation, window functions, common table expressions and recursive queries.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'unicode',
    title: 'Unicode and Japanese text',
    summary:
      'Code points, UTF-16 and graphemes, normalization, vertical writing and ruby, and how Dokseo handles Japanese text.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'workers',
    title: 'Workers and data transfer',
    summary:
      'Dedicated workers, cloning and transferring data, SharedArrayBuffer and Atomics, and how Dokseo uses workers.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'typescript-types',
    title: 'TypeScript type design',
    summary:
      'Structural typing, unions and narrowing, exhaustive matching, brands, parsing at the boundary, and solving a type problem by construction instead of with a cast.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'async-correctness',
    title: 'Async correctness',
    summary:
      'Races and stale answers, cancellation, promises that never settle, and the patterns Dokseo uses against them.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'indexeddb',
    title: 'IndexedDB as a database',
    summary:
      'Stores, keys and indexes, transactions, version upgrades, and joining data in code because IndexedDB has no joins.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'accessibility',
    title: 'Accessibility in a reader',
    summary:
      'The accessibility tree, names and roles, focus, keyboard paging, modal dialogs and focus traps, live regions, motion, contrast and recognized text, applied to Dokseo.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'production-builds',
    title: 'Optimizing production builds',
    summary:
      'Chunks and code splitting, minification, hashed file names, tree shaking and side effects, dead code behind build flags and the precache, then how Dokseo keeps its build small.',
    status: 'published',
    kind: 'explainer',
  },
  {
    slug: 'word-analysis-plan',
    title: 'Plan: word analysis and dictionary',
    summary:
      'Word boundaries, readings and base forms from a morphological analyzer, dictionary lookup with JMdict and KRDict, and the plan for adding both to Dokseo.',
    status: 'published',
    kind: 'plan',
    buildsAfter: '1.0',
  },
  {
    slug: 'series-plan',
    title: 'Plan: series',
    summary:
      'Volumes and reading order, identity and grouping, stored data across versions, series metadata in EPUB and ComicInfo, and the plan for series in Dokseo.',
    status: 'published',
    kind: 'plan',
    buildsAfter: '1.0',
  },
  {
    slug: 'remote-storage-plan',
    title: 'Plan: books from OPDS catalogs',
    summary:
      'OPDS 1.2 feeds, what the browser requires of a static app calling another server, the records that join a catalog entry to a held book, downloads into OPFS, credentials and a proxy setup.',
    status: 'published',
    kind: 'plan',
    buildsAfter: '1.0',
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

function docsTopicStanding(topic: DocsTopic): string | null {
  return topic.kind === 'plan' ? `Planned after ${topic.buildsAfter}. Not built yet.` : null;
}

function docsIndexEntries(topics: readonly DocsTopic[]): readonly DocsIndexEntry[] {
  const explainers = topics.filter((topic) => topic.kind === 'explainer');
  const plans = topics.filter((topic) => topic.kind === 'plan');
  return [...explainers, ...plans].map((topic) =>
    topic.status === 'published'
      ? { kind: 'link', topic, href: docsTopicHref(topic.slug) }
      : { kind: 'coming', topic },
  );
}

export { DOCS_ROOT, DOCS_TOPICS, docsIndexEntries, docsTopic, docsTopicHref, docsTopicStanding };
export type { DocsIndexEntry, DocsTopic, DocsTopicSlug, DocsTopicStatus };
