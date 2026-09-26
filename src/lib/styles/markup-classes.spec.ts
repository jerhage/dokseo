import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE = new URL('../../', import.meta.url);
const STYLES = new URL('./', import.meta.url);
const LIBRARY_FOLDERS = ['components/', 'utilities/', 'overrides/'];

type Written = { readonly file: string; readonly name: string; readonly defined: boolean };

function filesUnder(root: URL, extension: string): readonly string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith(extension))
    .map((path) => path.split('\\').join('/'))
    .toSorted();
}

function read(root: URL, path: string): string {
  return readFileSync(new URL(path, root), 'utf8');
}

function classesIn(css: string): ReadonlySet<string> {
  const plain = css.replaceAll(/\/\*[\s\S]*?\*\//gu, '');
  return new Set(Array.from(plain.matchAll(/\.([a-z][\w-]*)/gu), (found) => found[1] ?? ''));
}

function ownStyles(source: string): string {
  return Array.from(
    source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gu),
    (found) => found[1] ?? '',
  ).join('\n');
}

function literalNames(attribute: string): readonly string[] {
  return attribute.split(/\s+/u).filter((name) => name !== '' && !/[{}]/u.test(name));
}

function expressionNames(expression: string): readonly string[] {
  return Array.from(
    expression.matchAll(/(?<![=!]==\s*)'([a-z][\w-]*(?: [a-z][\w-]*)*)'/gu),
    (found) => found[1] ?? '',
  ).flatMap((names) => names.split(' '));
}

function writtenClasses(source: string): readonly string[] {
  const markup = source.replaceAll(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gu, '');
  const attributes = Array.from(
    markup.matchAll(/\b(?:class|[a-z]+Class)="([^"]*)"/gu),
    (found) => found[1] ?? '',
  ).flatMap(literalNames);
  const expressions = Array.from(
    markup.matchAll(/\b(?:class|[a-z]+Class)=\{([\s\S]*?)\}(?=[\s>/])/gu),
    (found) => found[1] ?? '',
  ).flatMap(expressionNames);
  const directives = Array.from(
    markup.matchAll(/\bclass:([a-z][\w-]*)/gu),
    (found) => found[1] ?? '',
  );
  return [...attributes, ...expressions, ...directives];
}

function everyWrittenClass(): readonly Written[] {
  const stylesheets = filesUnder(SOURCE, '.css')
    .map((path) => read(SOURCE, path))
    .join('\n');
  const defined = classesIn(stylesheets);
  return filesUnder(SOURCE, '.svelte').flatMap((file) => {
    const source = read(SOURCE, file);
    const local = classesIn(ownStyles(source));
    return writtenClasses(source).map((name) => ({
      file,
      name,
      defined: defined.has(name) || local.has(name),
    }));
  });
}

function libraryFamilies(): ReadonlySet<string> {
  const css = LIBRARY_FOLDERS.flatMap((folder) => {
    const root = new URL(folder, STYLES);
    return filesUnder(root, '.css').map((path) => read(root, path));
  }).join('\n');
  return new Set(Array.from(classesIn(css), (name) => name.split('-')[0] ?? ''));
}

function family(name: string): string {
  return name.split('-')[0] ?? '';
}

describe('the classes the markup writes', () => {
  it('reads class attributes, class expressions and class props', () => {
    const written = everyWrittenClass();
    const namesIn = (file: string): readonly string[] =>
      written.filter((found) => found.file.endsWith(file)).map((found) => found.name);
    const library = namesIn('domains/library/ui/LibraryScreen.svelte');
    const shelf = namesIn('domains/library/ui/ShelfView.svelte');

    expect(library).toEqual(
      expect.arrayContaining(['layout-app-shell-header', 'layout-app-shell-wide-only']),
    );
    expect(shelf).toContain('layout-app-shell-narrow-nowrap');
  });

  it('finds every class of a design system family in some stylesheet', () => {
    const families = libraryFamilies();

    const missing = everyWrittenClass()
      .filter((written) => !written.defined && families.has(family(written.name)))
      .map((written) => `${written.file}: ${written.name}`);

    expect(missing).toEqual([]);
  });
});
