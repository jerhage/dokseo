import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BEHAVIOURS,
  COMPONENTS,
  CORE_PATH,
  DOKSEO_FILES_NAMING_CORE_PATHS,
  ICON_COUNT,
  INVENTORY,
  LIBRARY_ROOT,
  SERVER_RENDER_SPEC_COUNT,
  behaviourCount,
  behaviourOf,
} from './core-inventory';

function matchingFiles(pattern: string): readonly string[] {
  const slash = pattern.lastIndexOf('/');
  const folder = pattern.slice(0, slash);
  const ending = pattern.slice(slash + 2);
  return readdirSync(join(LIBRARY_ROOT, folder)).filter((name) => name.endsWith(ending));
}

const LEFT_OUT = ['src/lib/ui/', 'src/lib/domains/docs/'];

function sourceFiles(folder: string): readonly string[] {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

describe('the Kandan UI inventory', () => {
  it('lists every file and folder at the top of the library', () => {
    const unlisted = readdirSync(LIBRARY_ROOT).filter(
      (name) =>
        name !== 'node_modules' &&
        !INVENTORY.some((row) => row.path === name || row.path.startsWith(`${name}/`)),
    );

    expect(unlisted).toEqual([]);
  });

  it('names only paths that exist', () => {
    const missing = INVENTORY.filter((row) =>
      row.path.includes('*')
        ? matchingFiles(row.path).length === 0
        : !existsSync(join(LIBRARY_ROOT, row.path)),
    ).map((row) => row.path);

    expect(missing).toEqual([]);
  });

  it('lists exactly the components the library holds', () => {
    const files = readdirSync(join(LIBRARY_ROOT, 'components'))
      .filter((name) => name.endsWith('.svelte'))
      .map((name) => name.slice(0, -'.svelte'.length))
      .toSorted();

    expect([...COMPONENTS].toSorted()).toEqual(files);
  });

  it('classifies only components that exist, each once', () => {
    const named = BEHAVIOURS.map((row) => row.component);

    expect(named.filter((name) => !COMPONENTS.some((component) => component === name))).toEqual([]);
    expect(new Set(named).size).toBe(named.length);
  });

  it('counts every component under exactly one behaviour', () => {
    const total =
      behaviourCount('markup') +
      behaviourCount('native') +
      behaviourCount('native-script') +
      behaviourCount('script');

    expect(total).toBe(COMPONENTS.length);
    expect(behaviourOf('Badge')).toBe('markup');
  });

  it('counts the icons the library holds', () => {
    const icons = readdirSync(join(LIBRARY_ROOT, 'components', 'icons')).filter(
      (name) => name.endsWith('.svelte') && name !== 'Icon.svelte',
    );

    expect(icons).toHaveLength(ICON_COUNT);
  });

  it('counts the component specs that render with svelte/server', () => {
    const specs = sourceFiles(join(LIBRARY_ROOT, 'components')).filter(
      (path) => path.endsWith('.spec.ts') && readFileSync(path, 'utf8').includes("'svelte/server'"),
    );

    expect(specs).toHaveLength(SERVER_RENDER_SPEC_COUNT);
  });

  it('lists every Dokseo file that names a path the core takes over', () => {
    const naming = [...sourceFiles('src'), 'vite.config.ts']
      .filter((path) => !LEFT_OUT.some((folder) => path.startsWith(folder)))
      .filter((path) => CORE_PATH.test(readFileSync(path, 'utf8')))
      .toSorted();

    expect(naming).toEqual([...DOKSEO_FILES_NAMING_CORE_PATHS].toSorted());
  });
});
