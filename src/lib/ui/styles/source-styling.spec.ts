import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const LIBRARY = new URL('../', import.meta.url);
const TEXT_EXTENSIONS = ['.css', '.svelte', '.ts', '.js', '.html'];
const PLAYGROUND = 'playground/';
const LEGACY_PROPERTY = new RegExp('(?<![\\w-])--[cfsr]-[\\w-]+', 'u');

function libraryFiles(extensions: readonly string[]): readonly string[] {
  return readdirSync(LIBRARY, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(fileURLToPath(LIBRARY), join(entry.parentPath, entry.name)))
    .map((path) => path.split('\\').join('/'))
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .toSorted();
}

function read(path: string): string {
  return readFileSync(new URL(path, LIBRARY), 'utf8');
}

function closingBrace(css: string, open: number): number {
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function isOneScopedFeatureBlock(source: string): boolean {
  const css = source.replaceAll(/\/\*[\s\S]*?\*\//gu, '').trim();
  const head = /^@layer features\s*\{\s*@scope\s*\([^(){};]+\)\s*\{/u.exec(css);
  if (head === null) return false;
  const scopeOpen = head[0].length - 1;
  const scopeClose = closingBrace(css, scopeOpen);
  if (scopeClose === -1) return false;
  const inside = css.slice(scopeOpen + 1, scopeClose);
  const after = css.slice(scopeClose + 1).trim();
  return after === '}' && !/@layer|@scope/u.test(inside);
}

describe('the styling of the library source', () => {
  it('has no <style> block in any Svelte file', () => {
    const files = libraryFiles(['.svelte']);
    const offenders = files.filter((path) => /<style[\s>]/u.test(read(path)));

    expect(files.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it('references no legacy --c-, --f-, --s- or --r- custom property', () => {
    const offenders = libraryFiles(TEXT_EXTENSIONS).flatMap((path) => {
      const found = LEGACY_PROPERTY.exec(read(path));
      return found === null ? [] : [`${path}: ${found[0]}`];
    });

    expect(offenders).toEqual([]);
  });

  it('writes no eyebrow in the muted colour', () => {
    const offenders = libraryFiles(['.svelte', '.ts'])
      .filter((path) => !path.endsWith('.spec.ts'))
      .flatMap((path) =>
        Array.from(read(path).matchAll(/["'`]([^"'`]*)["'`]/gu), (found) => found[1] ?? '')
          .filter((classes) => /(?<![\w-])eyebrow(?![\w-])/u.test(classes))
          .filter((classes) => /(?<![\w-])text-muted(?![\w-])/u.test(classes))
          .map((classes) => `${path}: ${classes}`),
      );

    expect(offenders).toEqual([]);
  });

  it('writes every playground stylesheet as one @layer features block holding one @scope block', () => {
    const featureFiles = libraryFiles(['.css']).filter((path) => path.startsWith(PLAYGROUND));
    const offenders = featureFiles.filter((path) => !isOneScopedFeatureBlock(read(path)));

    expect(featureFiles.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
