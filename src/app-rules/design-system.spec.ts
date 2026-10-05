import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SOURCE = new URL('../', import.meta.url);
const LIBRARY_FOLDER = 'lib/ui/';
const LIBRARY_STYLES = new URL('lib/ui/styles/', SOURCE);
const DOCS_FOLDER = 'lib/domains/docs/';

function filesUnder(root: URL, extensions: readonly string[]): readonly string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(fileURLToPath(root), join(entry.parentPath, entry.name)))
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .map((path) => path.split('\\').join('/'))
    .toSorted();
}

function read(url: URL): string {
  return readFileSync(url, 'utf8');
}

function withoutComments(css: string): string {
  return css.replaceAll(/\/\*[\s\S]*?\*\//gu, '');
}

function orderStatement(css: string): string | null {
  return /@layer\s+[\w\s,-]+;/u.exec(css)?.[0].replaceAll(/\s+/gu, ' ') ?? null;
}

function dokseoFiles(extensions: readonly string[]): readonly string[] {
  return filesUnder(SOURCE, extensions).filter((path) => !path.startsWith(LIBRARY_FOLDER));
}

function queryWidths(css: string): readonly string[] {
  return Array.from(css.matchAll(/@(?:media|container)\b([^{]*)\{/gu), (found) =>
    Array.from((found[1] ?? '').matchAll(/\d+(?:\.\d+)?(?:rem|em|px)/gu), (width) => width[0]),
  ).flat();
}

function stylesheetWidths(root: URL, paths: readonly string[]): readonly string[] {
  return paths.flatMap((path) => queryWidths(withoutComments(read(new URL(path, root)))));
}

function narrowBreakpoint(): string {
  const primitives = withoutComments(read(new URL('base/primitives.css', LIBRARY_STYLES)));
  return /--ds-size-narrow\s*:\s*([^;]+);/u.exec(primitives)?.[1]?.trim() ?? '';
}

describe("Dokseo's use of the design system", () => {
  it('declares the layer order of index.css inline in app.html, and nothing else there', () => {
    const html = read(new URL('app.html', SOURCE));
    const inline = /<style>([\s\S]*?)<\/style>/u.exec(html)?.[1] ?? '';
    const library = orderStatement(withoutComments(read(new URL('index.css', LIBRARY_STYLES))));

    expect(orderStatement(inline)).toBe(
      '@layer open-props, reset, base, tokens, components, features, utilities, overrides;',
    );
    expect(inline.trim().replaceAll(/\s+/gu, ' ')).toBe(orderStatement(inline));
    expect(library).toBe(orderStatement(inline));
  });

  it('names no --ds- primitive outside the library, apart from the docs that quote them', () => {
    const offenders = dokseoFiles(['.css', '.svelte', '.html'])
      .filter((path) => !path.startsWith(DOCS_FOLDER))
      .filter((path) => read(new URL(path, SOURCE)).includes('--ds-'));

    expect(offenders).toEqual([]);
  });

  it('switches no query at the narrow breakpoint in its own stylesheets', () => {
    const narrow = narrowBreakpoint();
    const switching = dokseoFiles(['.css']).filter((path) =>
      stylesheetWidths(SOURCE, [path]).includes(narrow),
    );

    expect(narrow).toBe('48rem');
    expect(switching).toEqual([]);
  });

  it('switches every media and container query at a width the library queries switch at', () => {
    const scale = new Set(stylesheetWidths(LIBRARY_STYLES, filesUnder(LIBRARY_STYLES, ['.css'])));
    const offScale = dokseoFiles(['.css']).flatMap((path) =>
      stylesheetWidths(SOURCE, [path])
        .filter((width) => !scale.has(width))
        .map((width) => `${path}: ${width}`),
    );

    expect(scale.size).toBeGreaterThan(0);
    expect(offScale).toEqual([]);
  });
});
