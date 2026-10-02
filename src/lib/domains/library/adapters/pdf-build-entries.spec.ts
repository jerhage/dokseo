import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SOURCE = new URL('../../../../', import.meta.url);
const SCRIPT_EXTENSIONS = ['.ts', '.js', '.mjs', '.svelte'];
const ADAPTER = 'lib/domains/library/adapters/pdf-page-source.ts';
const URL_OF_AN_ENTRY = new RegExp('new URL\\(\\s*[\'"`]pdfjs-dist', 'u');
const LOADED_ENTRY = new RegExp(
  '(import|new URL)\\(\\s*[\'"`](pdfjs-dist(?:/[^\'"`]*)?)[\'"`]',
  'gu',
);
const VALUE_IMPORT = new RegExp('^import (?!type )[^;]*from [\'"`]pdfjs-dist', 'mu');
const MODERN_LIBRARY = new Set([
  'pdfjs-dist',
  'pdfjs-dist/build/pdf.mjs',
  'pdfjs-dist/build/pdf.min.mjs',
]);
const LEGACY_LIBRARY = new Set([
  'pdfjs-dist/legacy/build/pdf.mjs',
  'pdfjs-dist/legacy/build/pdf.min.mjs',
]);
const MODERN_WORKER = new Set([
  'pdfjs-dist/build/pdf.worker.mjs',
  'pdfjs-dist/build/pdf.worker.min.mjs',
]);
const LEGACY_WORKER = new Set([
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
]);

type Build = 'modern' | 'legacy';

interface LoadedEntry {
  readonly role: 'library' | 'worker';
  readonly build: Build | 'unknown';
}

function sourceFiles(): readonly string[] {
  return readdirSync(SOURCE, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(fileURLToPath(SOURCE), join(entry.parentPath, entry.name)))
    .map((path) => path.split('\\').join('/'))
    .filter((path) => SCRIPT_EXTENSIONS.some((extension) => path.endsWith(extension)))
    .toSorted();
}

function read(path: string): string {
  return readFileSync(new URL(path, SOURCE), 'utf8');
}

function classify(loader: string, entry: string): LoadedEntry {
  if (loader === 'import') {
    if (MODERN_LIBRARY.has(entry)) return { role: 'library', build: 'modern' };
    if (LEGACY_LIBRARY.has(entry)) return { role: 'library', build: 'legacy' };
    return { role: 'library', build: 'unknown' };
  }
  if (MODERN_WORKER.has(entry)) return { role: 'worker', build: 'modern' };
  if (LEGACY_WORKER.has(entry)) return { role: 'worker', build: 'legacy' };
  return { role: 'worker', build: 'unknown' };
}

function loadedEntries(): readonly LoadedEntry[] {
  return [...read(ADAPTER).matchAll(LOADED_ENTRY)].map(([, loader = '', entry = '']) =>
    classify(loader, entry),
  );
}

describe('pdf.js entry points', () => {
  it('keeps every new URL of a pdf.js entry inside the adapter', () => {
    const files = sourceFiles();
    const offenders = files.filter((path) => path !== ADAPTER && URL_OF_AN_ENTRY.test(read(path)));

    expect(files).toContain(ADAPTER);
    expect(offenders).toEqual([]);
  });

  it('imports only types from pdf.js statically, so no build loads before the choice', () => {
    expect(read(ADAPTER)).not.toMatch(VALUE_IMPORT);
  });

  it('loads a modern and a legacy build of the library and of the worker, and nothing else', () => {
    expect(
      loadedEntries().toSorted((a, b) =>
        `${a.role}${a.build}`.localeCompare(`${b.role}${b.build}`),
      ),
    ).toEqual([
      { role: 'library', build: 'legacy' },
      { role: 'library', build: 'modern' },
      { role: 'worker', build: 'legacy' },
      { role: 'worker', build: 'modern' },
    ]);
  });

  it('pairs each library build with the worker from the same build', () => {
    const entries = loadedEntries();
    const pairs = entries.flatMap((entry, position) =>
      position % 2 === 0 ? [{ library: entry, worker: entries[position + 1] }] : [],
    );

    expect(pairs).toEqual([
      {
        library: { role: 'library', build: 'modern' },
        worker: { role: 'worker', build: 'modern' },
      },
      {
        library: { role: 'library', build: 'legacy' },
        worker: { role: 'worker', build: 'legacy' },
      },
    ]);
  });
});
