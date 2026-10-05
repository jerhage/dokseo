import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { filesImporting, tallyImports } from '../../../domain/library-imports';
import {
  ABSOLUTE_FONT_URLS,
  FONT_FACES_FILE,
  LIBRARY_FOLDER,
  LIBRARY_REACH,
  RELATIVE_FONT_URLS,
  STYLES_FOLDER,
} from './library-reach';

function filesUnder(folder: string): readonly string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const LIBRARY_FILES = filesUnder(LIBRARY_FOLDER);

function reachOf(paths: readonly string[]) {
  const texts = paths.map((path) => readFileSync(path, 'utf8'));
  return {
    files: texts.length,
    aliased: filesImporting(texts, 'alias'),
    above: filesImporting(texts, 'parent'),
    tallies: tallyImports(texts),
  };
}

describe('the recorded reach of the UI library', () => {
  it('matches what the component source imports today', () => {
    const source = LIBRARY_FILES.filter((path) => !path.endsWith('.spec.ts'));

    expect(reachOf(source)).toEqual(LIBRARY_REACH.source);
  });

  it('matches what the component specs import and read today', () => {
    const specs = LIBRARY_FILES.filter((path) => path.endsWith('.spec.ts'));

    expect(reachOf(specs)).toEqual(LIBRARY_REACH.specs);
  });

  it('matches what the stylesheet specs import and read today', () => {
    const specs = filesUnder(STYLES_FOLDER).filter((path) => path.endsWith('.spec.ts'));

    expect(reachOf(specs)).toEqual(LIBRARY_REACH.styleSpecs);
  });

  it('counts the font URLs that point at the app root', () => {
    const css = readFileSync(FONT_FACES_FILE, 'utf8');

    expect(css.match(/url\('\/fonts\//gu) ?? []).toHaveLength(ABSOLUTE_FONT_URLS);
  });

  it('counts the font URLs relative to the stylesheet', () => {
    const css = readFileSync(FONT_FACES_FILE, 'utf8');

    expect(css.match(/url\('\.\.\/\.\.\/fonts\//gu) ?? []).toHaveLength(RELATIVE_FONT_URLS);
  });
});
