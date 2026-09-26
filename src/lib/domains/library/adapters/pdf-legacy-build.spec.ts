import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE = new URL('../../../../', import.meta.url);
const SCRIPT_EXTENSIONS = ['.ts', '.js', '.mjs', '.svelte'];
const MODERN_ENTRY = new RegExp('[\'"`]pdfjs-dist(?:/build/[^\'"`]*)?[\'"`]', 'u');
const LEGACY_ENTRY = new RegExp('[\'"`]pdfjs-dist/legacy/build/[^\'"`]+[\'"`]', 'u');

function sourceFiles(): readonly string[] {
  return readdirSync(SOURCE, { recursive: true, encoding: 'utf8' })
    .map((path) => path.split('\\').join('/'))
    .filter((path) => SCRIPT_EXTENSIONS.some((extension) => path.endsWith(extension)))
    .toSorted();
}

function read(path: string): string {
  return readFileSync(new URL(path, SOURCE), 'utf8');
}

describe('pdf.js entry points', () => {
  it('finds the source tree', () => {
    expect(sourceFiles()).toContain('lib/domains/library/adapters/pdf-page-source.ts');
  });

  it.each(sourceFiles())('keeps the modern pdf.js build out of %s', (path) => {
    expect(read(path)).not.toMatch(MODERN_ENTRY);
  });

  it('loads the pdf.js library and its worker from the legacy build', () => {
    const adapter = read('lib/domains/library/adapters/pdf-page-source.ts');
    expect(adapter).toMatch(LEGACY_ENTRY);
    expect(adapter).toContain('pdfjs-dist/legacy/build/pdf.worker.min.mjs');
  });
});
