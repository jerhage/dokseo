import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ALERT_VARIANTS,
  AVATAR_SHAPES,
  AVATAR_SIZES,
  AVATAR_VARIANTS,
  BADGE_COLOUR_CLASSES,
  BADGE_EMPHASES,
  BADGE_VARIANTS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  CARD_SIZES,
  CARD_VARIANTS,
  DROPZONE_SIZES,
  FIELD_LAYOUTS,
  MEDIA_RATIOS,
  MODAL_PLACEMENTS,
  MODAL_SIZES,
  PROGRESS_SIZES,
  PROGRESS_VARIANTS,
  RADIO_VARIANTS,
  SKELETON_SHAPES,
  STAT_SIZES,
  STAT_TRENDS,
  TABLE_SIZES,
  TABS_VARIANTS,
  TAG_COLOUR_CLASSES,
  TAG_COLOURS,
  TOAST_REGION_PLACEMENTS,
  TOAST_VARIANTS,
} from './classes';
import type { ClassList } from './classes';
import { fileItemView } from './file-item';
import type { FileItemData } from './file-item';

const FILE_ITEMS: readonly FileItemData[] = [
  { id: 'pending', name: 'a.pdf', size: 1, state: 'pending' },
  { id: 'uploading', name: 'a.pdf', size: 1, state: 'uploading', progress: 50 },
  { id: 'complete', name: 'a.pdf', size: 1, state: 'complete' },
  { id: 'error', name: 'a.pdf', size: 1, state: 'error', message: 'Failed' },
];

const STYLES = new URL('../styles/', import.meta.url);
const COMPONENTS = new URL('./', import.meta.url);

const TABLES: Readonly<Record<string, Readonly<Record<string, ClassList>>>> = {
  ALERT_VARIANTS,
  AVATAR_SHAPES,
  AVATAR_SIZES,
  AVATAR_VARIANTS,
  BADGE_COLOUR_CLASSES,
  BADGE_EMPHASES,
  BADGE_VARIANTS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  CARD_SIZES,
  CARD_VARIANTS,
  DROPZONE_SIZES,
  FIELD_LAYOUTS,
  MEDIA_RATIOS,
  MODAL_PLACEMENTS,
  MODAL_SIZES,
  PROGRESS_SIZES,
  PROGRESS_VARIANTS,
  RADIO_VARIANTS,
  SKELETON_SHAPES,
  STAT_SIZES,
  STAT_TRENDS,
  TABLE_SIZES,
  TABS_VARIANTS,
  TAG_COLOUR_CLASSES,
  TOAST_REGION_PLACEMENTS,
  TOAST_VARIANTS,
};

function cssFiles(folder: URL): readonly string[] {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(fileURLToPath(folder), join(entry.parentPath, entry.name)))
    .filter((path) => path.endsWith('.css'))
    .map((path) => readFileSync(new URL(path, folder), 'utf8'));
}

function definedClasses(): ReadonlySet<string> {
  const css = [
    ...cssFiles(new URL('components/', STYLES)),
    ...cssFiles(new URL('utilities/', STYLES)),
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

describe('the tag colour tables', () => {
  it('maps every tag colour, and no other, to the tag and badge class named after it', () => {
    expect(Object.keys(TAG_COLOUR_CLASSES).toSorted()).toEqual(TAG_COLOURS.toSorted());
    expect(Object.keys(BADGE_COLOUR_CLASSES).toSorted()).toEqual(TAG_COLOURS.toSorted());
    for (const colour of TAG_COLOURS) {
      expect({
        colour,
        tag: TAG_COLOUR_CLASSES[colour],
        badge: BADGE_COLOUR_CLASSES[colour],
      }).toEqual({
        colour,
        tag: [`tag-color-${colour}`],
        badge: [`badge-color-${colour}`],
      });
    }
  });
});

describe('the base components', () => {
  it('writes only classes the stylesheets define', () => {
    const defined = definedClasses();

    const missing = literalClasses()
      .filter(([, name]) => !defined.has(name))
      .map(([path, name]) => `${path}: ${name}`);

    expect(missing).toEqual([]);
  });
});

describe('fileItemView', () => {
  it('names only classes the stylesheets define', () => {
    const defined = definedClasses();

    const missing = FILE_ITEMS.flatMap((item) =>
      fileItemView(item)
        .classes.filter((name) => !defined.has(name))
        .map((name) => `${item.state}: ${name}`),
    );

    expect(missing).toEqual([]);
  });
});
