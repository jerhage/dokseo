import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAP_AREAS, areaReach, importVerdict, mapArea, mapVerdicts } from './import-map';
import type { AreaVerdicts } from './import-map';
import { LEAF_DOMAINS } from './import-rules';

const DOMAINS_ROOT = join('src', 'lib', 'domains');

function folderNames(path: string): readonly string[] {
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();
}

function verdictsFor(
  from: string,
  folder: Parameters<typeof mapVerdicts>[1],
): ReadonlyMap<string, AreaVerdicts> {
  return new Map(
    mapVerdicts(mapArea(from), folder).map((verdicts) => [verdicts.area.id, verdicts]),
  );
}

describe('the import map', () => {
  it('names every domain folder under src/lib/domains, with its real folders', () => {
    const mapped = MAP_AREAS.flatMap((area) =>
      area.kind === 'domain' ? [[area.id, [...area.folders]] as const] : [],
    );

    expect(new Map(mapped)).toEqual(
      new Map(
        folderNames(DOMAINS_ROOT).map((name) => [name, folderNames(join(DOMAINS_ROOT, name))]),
      ),
    );
  });

  it('marks as leaves exactly the domains the leaf rule lists', () => {
    const leaves = MAP_AREAS.filter((area) => area.kind === 'domain' && area.leaf).map(
      (area) => area.id,
    );

    expect(leaves.toSorted()).toEqual([...LEAF_DOMAINS].toSorted());
  });

  it('places every layer at a path that exists', () => {
    const roots = MAP_AREAS.flatMap((area) =>
      area.kind === 'layer' ? [area.path.split('/').slice(0, -1).join('/')] : [],
    );

    expect(roots.filter((root) => !existsSync(root))).toEqual([]);
  });

  it('lets storage use cases reach a leaf contract and nothing behind it', () => {
    const recognition = verdictsFor('storage', 'use-cases').get('recognition');

    expect(recognition?.targets.map((target) => [target.folder, target.verdict.kind])).toEqual([
      ['domain', 'allowed'],
      ['use-cases', 'allowed'],
      ['adapters', 'forbidden'],
      ['queries', 'forbidden'],
      ['ui', 'forbidden'],
    ]);
    expect(recognition === undefined ? null : areaReach(recognition)).toBe('some');
  });

  it('refuses every other domain to a leaf', () => {
    const verdicts = verdictsFor('library', 'ui');

    for (const other of ['storage', 'docs', 'viewing', 'flowing', 'recognition']) {
      const area = verdicts.get(other);
      expect(area === undefined ? null : areaReach(area)).toBe('none');
    }
  });

  it('allows queries a type-only import of their own use cases', () => {
    const own = verdictsFor('library', 'queries').get('library');

    expect(own?.targets.find((target) => target.folder === 'use-cases')?.verdict).toEqual({
      kind: 'type-only',
      rules: ['queries-call-use-cases-they-are-handed'],
    });
  });

  it('refuses the base components everything above them', () => {
    expect(importVerdict('src/lib/ui/components/Button.svelte', 'src/lib/shared/ids.ts')).toEqual({
      kind: 'forbidden',
      rules: ['base-components-know-no-app'],
    });
  });
});
