import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAP_AREAS, mapArea, mapVerdicts } from '../../../domain/import-map';
import { PATH_RULES, UNPORTED_RULES, sourcePath } from '../../../domain/import-rules';
import { MAP_ROWS, importMapDiagram } from './architecture-diagrams';
import { ARCHITECTURE_SECTIONS } from './architecture-sections';
import { CHECK_PRESETS, ImportCheck, checkVerdict } from './import-check.svelte';
import { ImportMapView } from './import-map.svelte';
import { RULE_NOTES } from './rule-notes';

describe('ImportCheck', () => {
  it('starts on the first preset and refuses a route that takes an adapter', () => {
    const check = new ImportCheck();

    expect(check.verdict).toEqual({
      kind: 'forbidden',
      from: 'src/routes/+page.svelte',
      to: 'src/lib/domains/library/adapters/indexeddb-opfs-library.repo.ts',
      rules: ['only-the-container-builds-adapters', 'routes-are-thin'],
    });
  });

  it('turns a refused value import into an allowed type-only import from queries', () => {
    const check = new ImportCheck();
    const preset = CHECK_PRESETS.find(
      (candidate) => candidate.label === 'A query calls a use case',
    );
    if (preset !== undefined) check.use(preset);

    expect(check.verdict.kind).toBe('forbidden');
    check.kind = 'type-only';
    expect(check.verdict.kind).toBe('allowed');
  });

  it('swaps the two paths', () => {
    const check = new ImportCheck();
    check.swap();

    expect(check.from).toBe('$lib/domains/library/adapters/indexeddb-opfs-library.repo.ts');
    expect(check.to).toBe('src/routes/+page.svelte');
  });

  it('waits for both paths before it judges', () => {
    expect(checkVerdict(' ', '$lib/shared/ids.ts', 'value')).toEqual({ kind: 'incomplete' });
  });

  it('names real files in every preset but the barrel', () => {
    const missing = CHECK_PRESETS.flatMap((preset) => [preset.from, preset.to])
      .map(sourcePath)
      .filter((path) => !existsSync(path));

    expect(missing).toEqual([
      'src/lib/domains/library/ui/index.ts',
      'src/lib/domains/library/ui/index.ts',
    ]);
  });
});

describe('ImportMapView', () => {
  it('starts on the storage use cases', () => {
    const view = new ImportMapView();

    expect(view.area.id).toBe('storage');
    expect(view.folder).toBe('use-cases');
    expect(view.folders).toEqual(['domain', 'use-cases', 'adapters', 'queries', 'ui']);
  });

  it('moves to a layer with no folder and back to a domain at its first folder', () => {
    const view = new ImportMapView();
    view.choose('shared');

    expect(view.folder).toBeNull();
    expect(view.folders).toEqual([]);

    view.choose('docs');
    expect(view.folder).toBe('domain');
  });

  it('ignores a folder the chosen domain does not have', () => {
    const view = new ImportMapView();
    view.choose('viewing');
    view.chooseFolder('adapters');

    expect(view.folder).toBe('domain');
    view.chooseFolder('queries');
    expect(view.folder).toBe('queries');
  });
});

describe('importMapDiagram', () => {
  it('places every area and marks the chosen one', () => {
    const chosen = mapArea('library');
    const diagram = importMapDiagram(chosen, mapVerdicts(chosen, 'ui'));

    expect(MAP_AREAS.every((area) => MAP_ROWS[area.id] !== undefined)).toBe(true);
    expect(
      diagram.nodes.filter((node) => node.tone === 'primary').map((node) => node.label),
    ).toEqual(['library']);
    expect(diagram.label).toContain('recognition forbidden');
  });
});

describe('the rule notes and sections', () => {
  it('describes every rule dependency-cruiser holds', () => {
    const names = [...PATH_RULES.map((rule) => rule.name), ...UNPORTED_RULES];

    expect(Object.keys(RULE_NOTES).toSorted()).toEqual(names.toSorted());
  });

  it('gives every section a distinct title', () => {
    const titles = Object.values(ARCHITECTURE_SECTIONS);

    expect(new Set(titles).size).toBe(titles.length);
  });
});
