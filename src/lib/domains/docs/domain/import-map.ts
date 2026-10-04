import { match } from 'ts-pattern';
import { LEAF_DOMAINS, refusingRules } from './import-rules';

type DomainFolder = 'domain' | 'use-cases' | 'adapters' | 'queries' | 'ui';

type MapArea =
  | {
      readonly kind: 'layer';
      readonly id: string;
      readonly label: string;
      readonly path: string;
    }
  | {
      readonly kind: 'domain';
      readonly id: string;
      readonly label: string;
      readonly leaf: boolean;
      readonly folders: readonly DomainFolder[];
    };

type ImportVerdict =
  | { readonly kind: 'allowed' }
  | { readonly kind: 'type-only'; readonly rules: readonly string[] }
  | { readonly kind: 'forbidden'; readonly rules: readonly string[] };

type MapTarget = {
  readonly folder: DomainFolder | null;
  readonly path: string;
  readonly verdict: ImportVerdict;
};

type AreaVerdicts = {
  readonly area: MapArea;
  readonly targets: readonly MapTarget[];
};

type AreaReach = 'all' | 'some' | 'none';

const DOMAIN_FOLDERS: readonly DomainFolder[] = [
  'domain',
  'use-cases',
  'adapters',
  'queries',
  'ui',
];

function leafDomain(id: string): boolean {
  return LEAF_DOMAINS.some((leaf) => leaf === id);
}

function domainArea(id: string, folders: readonly DomainFolder[]): MapArea {
  return { kind: 'domain', id, label: id, leaf: leafDomain(id), folders };
}

function layerArea(id: string, label: string, path: string): MapArea {
  return { kind: 'layer', id, label, path };
}

const MAP_AREAS: readonly MapArea[] = [
  layerArea('routes', 'routes/', 'src/routes/+page.svelte'),
  layerArea('container', 'container.ts', 'src/lib/container.ts'),
  layerArea('composition', 'composition/', 'src/lib/composition/sample.ts'),
  domainArea('storage', ['adapters', 'domain', 'queries', 'ui', 'use-cases']),
  domainArea('docs', ['domain', 'ui']),
  domainArea('library', ['adapters', 'domain', 'queries', 'ui', 'use-cases']),
  domainArea('viewing', ['domain', 'queries', 'ui']),
  domainArea('flowing', ['adapters', 'domain', 'queries', 'ui', 'use-cases']),
  domainArea('recognition', ['adapters', 'domain', 'queries', 'ui', 'use-cases']),
  layerArea('shared', 'shared/', 'src/lib/shared/sample.ts'),
  layerArea('platform', 'platform/', 'src/lib/platform/sample.ts'),
  layerArea('workers', 'workers/', 'src/workers/sample.ts'),
  layerArea('components', 'components/', 'src/lib/components/Sample.svelte'),
];

function folderPath(area: MapArea, folder: DomainFolder): string {
  return `src/lib/domains/${area.id}/${folder}/sample.ts`;
}

function orderedFolders(folders: readonly DomainFolder[]): readonly DomainFolder[] {
  return DOMAIN_FOLDERS.filter((folder) => folders.includes(folder));
}

function importVerdict(from: string, to: string): ImportVerdict {
  const forbidden = refusingRules(from, to, 'value');
  if (forbidden.length === 0) return { kind: 'allowed' };
  const typeForbidden = refusingRules(from, to, 'type-only');
  if (typeForbidden.length === 0) return { kind: 'type-only', rules: forbidden };
  return { kind: 'forbidden', rules: forbidden };
}

function areaPaths(area: MapArea): readonly { folder: DomainFolder | null; path: string }[] {
  return match(area)
    .with({ kind: 'layer' }, ({ path }) => [{ folder: null, path }])
    .with({ kind: 'domain' }, (domain) =>
      orderedFolders(domain.folders).map((folder) => ({
        folder,
        path: folderPath(domain, folder),
      })),
    )
    .exhaustive();
}

function sourceOf(area: MapArea, folder: DomainFolder | null): string {
  return match(area)
    .with({ kind: 'layer' }, ({ path }) => path)
    .with({ kind: 'domain' }, (domain) => folderPath(domain, folder ?? 'domain'))
    .exhaustive();
}

function mapVerdicts(from: MapArea, folder: DomainFolder | null): readonly AreaVerdicts[] {
  const source = sourceOf(from, folder);
  return MAP_AREAS.map((area) => ({
    area,
    targets: areaPaths(area).map(({ folder: target, path }) => ({
      folder: target,
      path,
      verdict: importVerdict(source, path),
    })),
  }));
}

function areaReach(verdicts: AreaVerdicts): AreaReach {
  const allowed = verdicts.targets.filter((target) => target.verdict.kind !== 'forbidden').length;
  if (allowed === 0) return 'none';
  return allowed === verdicts.targets.length ? 'all' : 'some';
}

function mapArea(id: string): MapArea {
  const area = MAP_AREAS.find((candidate) => candidate.id === id);
  if (area === undefined) throw new Error(`No map area is named ${id}`);
  return area;
}

export {
  DOMAIN_FOLDERS,
  MAP_AREAS,
  areaReach,
  importVerdict,
  mapArea,
  mapVerdicts,
  orderedFolders,
};
export type { AreaReach, AreaVerdicts, DomainFolder, ImportVerdict, MapArea, MapTarget };
