import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shellAssets } from '$lib/platform/service-worker/shell-cache';
import {
  BUILD_WITH_PLUGIN,
  BUILD_WITHOUT_PLUGIN,
  groupTotals,
  precachedStatic,
  staticFiles,
} from './recorded-build';

const DEV_ONLY_ROUTES = ['docs', 'playground', 'preview'].map((name) =>
  join('src', 'routes', name),
);

const ROUTE_COMPONENT = /^\+(?:page|layout)\.svelte$/u;

const ROUTE_GUARD = /^\+(?:page|layout)\.ts$/u;

function filesUnder(folder: string): readonly string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function devOnlyFilesNamed(pattern: RegExp): number {
  return DEV_ONLY_ROUTES.flatMap(filesUnder).filter((path) =>
    pattern.test(path.split(/[/\\]/u).at(-1) ?? ''),
  ).length;
}

const OS_METADATA_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

const STATIC_FILES = filesUnder('static')
  .filter((path) => !OS_METADATA_FILES.has(path.split(/[/\\]/u).at(-1) ?? ''))
  .map((path) => relative('static', path));

describe('the recorded builds', () => {
  it.each([BUILD_WITH_PLUGIN, BUILD_WITHOUT_PLUGIN])(
    'adds its groups up to its totals',
    (build) => {
      expect(groupTotals(build)).toEqual({ files: build.files, bytes: build.bytes });
    },
  );

  it('records one emptied or guarded node for every dev-only route component in src/routes', () => {
    expect(BUILD_WITH_PLUGIN.stubNodes + BUILD_WITH_PLUGIN.guardNodes).toBe(
      devOnlyFilesNamed(ROUTE_COMPONENT),
    );
  });

  it('records one guard node for every dev-only load file', () => {
    expect(BUILD_WITH_PLUGIN.guardNodes).toBe(devOnlyFilesNamed(ROUTE_GUARD));
  });

  it.each([BUILD_WITH_PLUGIN, BUILD_WITHOUT_PLUGIN])(
    'counts every file in static/ and precaches the ones the shell cache keeps',
    (build) => {
      expect(staticFiles(build)).toBe(STATIC_FILES.length);
      expect(precachedStatic(build)).toBe(shellAssets('', [], STATIC_FILES).length - 1);
    },
  );
});
