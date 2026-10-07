import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contentsEntries } from '$lib/ui/components/table-of-contents';
import { DOCS_ROOT, DOCS_TOPICS } from '../../domain/topics';
import type { DocsTopicSlug } from '../../domain/topics';
import * as accessibility from './accessibility/accessibility-sections';
import * as architecture from './architecture/architecture-sections';
import * as asyncCorrectness from './async-correctness/async-sections';
import * as bookIdentity from './book-identity/sections';
import * as epubRendering from './epub-rendering/epub-sections';
import * as exampleDrift from './example-drift/drift-sections';
import * as exportImport from './export-import/export-import-sections';
import * as indexedDb from './indexeddb/indexeddb-sections';
import * as kandanCorePlan from './kandan-core-plan/core-sections';
import * as ocr from './ocr/ocr-sections';
import * as productionBuilds from './production-builds/build-sections';
import * as offline from './offline/sections';
import * as releasesAndCi from './releases-and-ci/sections';
import * as renderingPages from './rendering-pages/rendering-sections';
import * as securityHeaders from './security-headers/sections';
import * as seriesPlan from './series-plan/series-sections';
import * as sqlPatterns from './sql-patterns/sql-patterns-sections';
import * as sqlSetTheory from './sql-set-theory/sql-set-sections';
import * as storage from './storage/storage-sections';
import * as storedFormat from './stored-format/stored-format-sections';
import * as testing from './testing/testing-sections';
import * as touchAndPointers from './touch-and-pointers/sections';
import * as tripleClick from './triple-click-selection/triple-click-sections';
import * as uiLibrary from './ui-library/sections';
import * as typescriptTypes from './typescript-types/type-sections';
import * as unicode from './unicode/unicode-sections';
import * as vendoredUi from './vendored-ui/vendored-sections';
import * as wordAnalysisPlan from './word-analysis-plan/plan-sections';
import * as workers from './workers/workers-sections';

type DocsLink = {
  readonly file: string;
  readonly page: DocsTopicSlug | null;
  readonly href: string;
};

const SECTIONS: Record<DocsTopicSlug, Readonly<Record<string, string>>> = {
  'ui-library': uiLibrary.UI_LIBRARY_SECTIONS,
  'security-headers': securityHeaders.SECTIONS,
  ocr: ocr.OCR_SECTIONS,
  offline: offline.OFFLINE_SECTIONS,
  storage: storage.STORAGE_SECTIONS,
  'stored-format': storedFormat.STORED_FORMAT_SECTIONS,
  'epub-rendering': epubRendering.EPUB_SECTIONS,
  'triple-click-selection': tripleClick.TRIPLE_CLICK_SECTIONS,
  'book-identity': bookIdentity.IDENTITY_SECTIONS,
  'export-import': exportImport.EXPORT_IMPORT_SECTIONS,
  'touch-and-pointers': touchAndPointers.TOUCH_SECTIONS,
  architecture: architecture.ARCHITECTURE_SECTIONS,
  'rendering-pages': renderingPages.RENDERING_SECTIONS,
  'releases-and-ci': releasesAndCi.RELEASE_SECTIONS,
  testing: testing.TESTING_SECTIONS,
  'example-drift': exampleDrift.DRIFT_SECTIONS,
  'sql-set-theory': sqlSetTheory.SQL_SET_SECTIONS,
  'sql-patterns': sqlPatterns.SQL_PATTERNS_SECTIONS,
  unicode: unicode.UNICODE_SECTIONS,
  workers: workers.WORKERS_SECTIONS,
  'typescript-types': typescriptTypes.TYPE_SECTIONS,
  'async-correctness': asyncCorrectness.ASYNC_SECTIONS,
  indexeddb: indexedDb.INDEXEDDB_SECTIONS,
  accessibility: accessibility.ACCESSIBILITY_SECTIONS,
  'production-builds': productionBuilds.BUILD_SECTIONS,
  'word-analysis-plan': wordAnalysisPlan.WORD_PLAN_SECTIONS,
  'series-plan': seriesPlan.SERIES_PLAN_SECTIONS,
  'vendored-ui': vendoredUi.VENDORED_SECTIONS,
  'kandan-core-plan': kandanCorePlan.KANDAN_CORE_SECTIONS,
};

const SECTION_MODULES: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  'accessibility/accessibility-sections.ts': accessibility,
  'architecture/architecture-sections.ts': architecture,
  'async-correctness/async-sections.ts': asyncCorrectness,
  'book-identity/sections.ts': bookIdentity,
  'epub-rendering/epub-sections.ts': epubRendering,
  'example-drift/drift-sections.ts': exampleDrift,
  'export-import/export-import-sections.ts': exportImport,
  'indexeddb/indexeddb-sections.ts': indexedDb,
  'kandan-core-plan/core-sections.ts': kandanCorePlan,
  'ocr/ocr-sections.ts': ocr,
  'offline/sections.ts': offline,
  'production-builds/build-sections.ts': productionBuilds,
  'releases-and-ci/sections.ts': releasesAndCi,
  'rendering-pages/rendering-sections.ts': renderingPages,
  'security-headers/sections.ts': securityHeaders,
  'series-plan/series-sections.ts': seriesPlan,
  'sql-patterns/sql-patterns-sections.ts': sqlPatterns,
  'sql-set-theory/sql-set-sections.ts': sqlSetTheory,
  'storage/storage-sections.ts': storage,
  'stored-format/stored-format-sections.ts': storedFormat,
  'testing/testing-sections.ts': testing,
  'touch-and-pointers/sections.ts': touchAndPointers,
  'triple-click-selection/triple-click-sections.ts': tripleClick,
  'ui-library/sections.ts': uiLibrary,
  'typescript-types/type-sections.ts': typescriptTypes,
  'unicode/unicode-sections.ts': unicode,
  'vendored-ui/vendored-sections.ts': vendoredUi,
  'workers/workers-sections.ts': workers,
  'word-analysis-plan/plan-sections.ts': wordAnalysisPlan,
};

const TOPICS_FOLDER = join('src', 'lib', 'domains', 'docs', 'ui', 'topics');

const SOURCE_FOLDERS = [join('src', 'lib', 'domains', 'docs'), join('src', 'routes', 'docs')];

const HREF_ATTRIBUTE = /href="([^"{}]*)"/gu;

const DOCS_STRING = /['"`](\/docs(?:\/[a-z-]+)?(?:#[^'"`$]*)?)['"`]/gu;

function sourceFiles(folder: string): readonly string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (entry.name.endsWith('.spec.ts')) return [];
    return entry.name.endsWith('.svelte') || entry.name.endsWith('.ts') ? [path] : [];
  });
}

function isTopicSlug(name: string): name is DocsTopicSlug {
  return DOCS_TOPICS.some((topic) => topic.slug === name);
}

function pageOf(file: string): DocsTopicSlug | null {
  const [folder] = relative(TOPICS_FOLDER, file).split(sep);
  return folder !== undefined && isTopicSlug(folder) ? folder : null;
}

function linksIn(file: string): readonly DocsLink[] {
  const text = readFileSync(file, 'utf8');
  const page = pageOf(file);
  const attributes = [...text.matchAll(HREF_ATTRIBUTE)].map((match) => match[1] ?? '');
  const strings = [...text.matchAll(DOCS_STRING)].map((match) => match[1] ?? '');
  return [...new Set([...attributes, ...strings])]
    .filter(
      (href) => href.startsWith('#') || href === DOCS_ROOT || href.startsWith(`${DOCS_ROOT}/`),
    )
    .map((href) => ({ file, page, href }));
}

function exportedHrefs(): readonly DocsLink[] {
  return Object.entries(SECTION_MODULES).flatMap(([path, module]) =>
    Object.entries(module).flatMap(([name, value]) => {
      if (!name.endsWith('_HREF') || typeof value !== 'string') return [];
      const [folder = ''] = path.split('/');
      return [{ file: path, page: isTopicSlug(folder) ? folder : null, href: value }];
    }),
  );
}

function anchorsOf(slug: DocsTopicSlug): ReadonlySet<string> {
  const headings = Object.values(SECTIONS[slug]).map((title) => ({ title }));
  return new Set(contentsEntries(headings).map((entry) => entry.id));
}

function brokenLinks(links: readonly DocsLink[]): readonly string[] {
  return links.flatMap((link) => {
    const [path = '', anchor] = link.href.split('#');
    const target = path === '' ? link.page : path.slice(`${DOCS_ROOT}/`.length);
    if (path === DOCS_ROOT) return anchor === undefined ? [] : [`${link.file}: ${link.href}`];
    if (target === null || !isTopicSlug(target)) return [`${link.file}: ${link.href}`];
    if (anchor !== undefined && !anchorsOf(target).has(anchor))
      return [`${link.file}: ${link.href}`];
    return [];
  });
}

const SOURCE_LINKS = SOURCE_FOLDERS.flatMap(sourceFiles).flatMap(linksIn);

describe('the links between docs pages', () => {
  it('finds the hand-written links in the page source', () => {
    expect(SOURCE_LINKS.map((link) => link.href)).toContain(
      '/docs/storage#reading-a-stored-row-back',
    );
  });

  it('resolves every hand-written link to a topic and one of its section titles', () => {
    expect(brokenLinks(SOURCE_LINKS)).toEqual([]);
  });

  it('resolves every exported cross-page href to a topic and one of its section titles', () => {
    const hrefs = exportedHrefs();

    expect(hrefs.length).toBeGreaterThan(0);
    expect(brokenLinks(hrefs)).toEqual([]);
  });

  it('reports a link to a missing section, a missing topic and a same-page anchor nobody has', () => {
    const links: readonly DocsLink[] = [
      { file: 'a.svelte', page: 'ocr', href: '/docs/storage#no-such-section' },
      { file: 'b.svelte', page: 'ocr', href: '/docs/no-such-topic' },
      { file: 'c.svelte', page: 'ocr', href: '#shell' },
      { file: 'd.svelte', page: 'ocr', href: '/docs/storage#reading-a-stored-row-back' },
    ];

    expect(brokenLinks(links)).toEqual([
      'a.svelte: /docs/storage#no-such-section',
      'b.svelte: /docs/no-such-topic',
      'c.svelte: #shell',
    ]);
  });
});
