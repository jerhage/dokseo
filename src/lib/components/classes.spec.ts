import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ALERT_VARIANTS,
  AVATAR_SHAPES,
  AVATAR_SIZES,
  AVATAR_VARIANTS,
  BADGE_VARIANTS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  CARD_VARIANTS,
  MENU_ALIGNS,
  MODAL_SIZES,
  PROGRESS_SIZES,
  PROGRESS_VARIANTS,
  SKELETON_SHAPES,
  STAT_TRENDS,
  TABS_VARIANTS,
  TOAST_VARIANTS,
} from './classes';
import type { ClassList } from './classes';
const STYLES = new URL('../styles/', import.meta.url);
const COMPONENTS = new URL('./', import.meta.url);

const TABLES: Readonly<Record<string, Readonly<Record<string, ClassList>>>> = {
  ALERT_VARIANTS,
  AVATAR_SHAPES,
  AVATAR_SIZES,
  AVATAR_VARIANTS,
  BADGE_VARIANTS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  CARD_VARIANTS,
  MENU_ALIGNS,
  MODAL_SIZES,
  PROGRESS_SIZES,
  PROGRESS_VARIANTS,
  SKELETON_SHAPES,
  STAT_TRENDS,
  TABS_VARIANTS,
  TOAST_VARIANTS,
};

function cssFiles(folder: URL): readonly string[] {
  return readdirSync(folder, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('.css'))
    .map((path) => readFileSync(new URL(path, folder), 'utf8'));
}

function definedClasses(): ReadonlySet<string> {
  const css = [
    ...cssFiles(new URL('components/', STYLES)),
    ...cssFiles(new URL('overrides/', STYLES)),
  ].join('\n');
  return new Set([...css.matchAll(/\.([a-z][a-z0-9-]*)/gu)].map((found) => found[1] ?? ''));
}

function literalClasses(): readonly (readonly [string, string])[] {
  return readdirSync(COMPONENTS, { encoding: 'utf8' })
    .filter((path) => path.endsWith('.svelte'))
    .flatMap((path) => {
      const source = readFileSync(new URL(path, COMPONENTS), 'utf8');
      const attributes = [...source.matchAll(/class="([^"{]*)"/gu)].map((found) => found[1] ?? '');
      const arrays = [...source.matchAll(/class=\{\[([\s\S]*?)\]\}/gu)].flatMap((found) =>
        [...(found[1] ?? '').matchAll(/'([a-z][a-z0-9-]*)'(?=\s*[:,\]])/gu)].map(
          (literal) => literal[1] ?? '',
        ),
      );
      return [...attributes, ...arrays]
        .flatMap((names) => names.split(/\s+/u))
        .filter((name) => name !== '')
        .map((name) => [path, name] as const);
    });
}

describe('the base component class tables', () => {
  it('names only classes the stylesheets define', () => {
    const defined = definedClasses();

    const missing = Object.entries(TABLES).flatMap(([table, entries]) =>
      Object.values(entries)
        .flat()
        .filter((name) => !defined.has(name))
        .map((name) => `${table}: ${name}`),
    );

    expect(missing).toEqual([]);
  });

  it('gives every variant in a table a different class list', () => {
    const repeated = Object.entries(TABLES).filter(([, entries]) => {
      const lists = Object.values(entries).map((list) => list.join(' '));
      return new Set(lists).size !== lists.length;
    });

    expect(repeated.map(([table]) => table)).toEqual([]);
  });
});

describe('the base components', () => {
  it('write only classes the stylesheets define', () => {
    const defined = definedClasses();

    const missing = literalClasses()
      .filter(([, name]) => !defined.has(name))
      .map(([path, name]) => `${path}: ${name}`);

    expect(missing).toEqual([]);
  });
});
