import { match } from 'ts-pattern';
import { MAP_AREAS, mapArea, mapVerdicts, orderedFolders } from '../../../domain/import-map';
import type { DomainFolder, MapArea } from '../../../domain/import-map';

function startingFolder(area: MapArea): DomainFolder | null {
  return match(area)
    .with({ kind: 'layer' }, () => null)
    .with({ kind: 'domain' }, ({ folders }) => {
      const ordered = orderedFolders(folders);
      return ordered.includes('use-cases') ? 'use-cases' : (ordered[0] ?? null);
    })
    .exhaustive();
}

function isDomainFolder(area: MapArea, value: string): value is DomainFolder {
  return area.kind === 'domain' && area.folders.some((folder) => folder === value);
}

class ImportMapView {
  area = $state.raw<MapArea>(mapArea('storage'));
  folder = $state.raw<DomainFolder | null>(startingFolder(mapArea('storage')));

  readonly verdicts = $derived(mapVerdicts(this.area, this.folder));

  readonly folders = $derived(this.area.kind === 'domain' ? orderedFolders(this.area.folders) : []);

  choose(id: string): void {
    const area = MAP_AREAS.find((candidate) => candidate.id === id);
    if (area === undefined) return;
    this.area = area;
    this.folder = startingFolder(area);
  }

  chooseFolder(value: string): void {
    if (isDomainFolder(this.area, value)) this.folder = value;
  }
}

export { ImportMapView, startingFolder };
