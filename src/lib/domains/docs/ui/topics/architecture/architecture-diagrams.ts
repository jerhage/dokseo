import type { DiagramBox, DiagramEdge, DiagramNode, DiagramTone } from '$lib/ui/components/diagram';
import { match } from 'ts-pattern';
import { areaReach } from '../../../domain/import-map';
import type { AreaReach, AreaVerdicts, MapArea } from '../../../domain/import-map';

type DiagramSpec = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
};

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail?: string,
  tone?: DiagramTone,
): DiagramBox {
  return {
    kind: 'box',
    x,
    y,
    width,
    height: detail === undefined ? 36 : 44,
    label,
    ...(detail === undefined ? {} : { detail }),
    ...(tone === undefined ? {} : { tone }),
  };
}

const LAYER_STEP = 58;

function layerRow(row: number): number {
  return row * LAYER_STEP;
}

const routesLayer = box(110, layerRow(0), 140, 'routes/', 'screens');
const uiLayer = box(110, layerRow(1), 140, 'ui/', 'view models');
const queriesLayer = box(110, layerRow(2), 140, 'queries/', 'keys, options');
const useCasesLayer = box(110, layerRow(3), 140, 'use-cases/', 'one operation', 'primary');
const domainLayer = box(110, layerRow(4), 140, 'domain/', 'ports, values', 'primary');
const sharedLayer = box(110, layerRow(5), 140, 'shared/', 'the kernel');
const platformLayer = box(110, layerRow(6), 140, 'platform/', 'browser APIs');
const rootLayer = box(0, layerRow(3), 100, 'container.ts', 'composition/', 'accent');
const adaptersLayer = box(0, layerRow(4), 100, 'adapters/', 'the how');
const componentsLayer = box(260, layerRow(5), 100, 'components/', 'base UI');

const LAYERS: DiagramSpec = {
  label:
    'Routes import domain ui, ui imports queries, queries import use cases, use cases import domain, domain imports shared, shared imports platform. container.ts and composition import the use cases and the adapters; adapters import the domain ports they implement; shared imports the base components.',
  width: 360,
  height: layerRow(6) + 44,
  nodes: [
    routesLayer,
    uiLayer,
    queriesLayer,
    useCasesLayer,
    domainLayer,
    sharedLayer,
    platformLayer,
    rootLayer,
    adaptersLayer,
    componentsLayer,
  ],
  edges: [
    { from: routesLayer, to: uiLayer },
    { from: uiLayer, to: queriesLayer },
    { from: queriesLayer, to: useCasesLayer },
    { from: useCasesLayer, to: domainLayer },
    { from: domainLayer, to: sharedLayer },
    { from: sharedLayer, to: platformLayer },
    { from: rootLayer, to: useCasesLayer },
    { from: rootLayer, to: adaptersLayer },
    { from: adaptersLayer, to: domainLayer },
    { from: sharedLayer, to: componentsLayer },
  ],
};

const useCase = box(110, 0, 140, 'renameTag', 'use case');
const port = box(110, 80, 140, 'TagRepository', 'port', 'primary');
const browserAdapter = box(0, 170, 170, 'createTagRepository', 'IndexedDB adapter');
const fakeAdapter = box(190, 170, 170, 'fakeTags', 'in memory, on this page', 'accent');

const PORT_AND_ADAPTERS: DiagramSpec = {
  label:
    'The renameTag use case imports the TagRepository port. Two adapters import and implement the same port: createTagRepository over IndexedDB, and an in-memory fake on this page.',
  width: 360,
  height: 214,
  nodes: [useCase, port, browserAdapter, fakeAdapter],
  edges: [
    { from: useCase, to: port, label: 'calls' },
    { from: browserAdapter, to: port, label: 'implements' },
    { from: fakeAdapter, to: port, label: 'implements' },
  ],
};

const catalogUseCases = box(110, 0, 140, 'Catalog use cases', 'browse, search, download');
const catalogPort = box(110, 80, 140, 'CatalogSource', 'port', 'primary');
const opds1Adapter = box(0, 170, 170, 'Opds1CatalogSource', 'HTTP client + Atom XML', 'accent');
const secondAdapter = box(190, 170, 170, 'A second adapter', 'not built');

const CATALOG_SOURCE: DiagramSpec = {
  label:
    'The catalog use cases call the CatalogSource port. One adapter exists and implements it: Opds1CatalogSource, which uses an HTTP client and reads Atom XML. A second adapter, not built, would implement the same port.',
  width: 360,
  height: 214,
  nodes: [catalogUseCases, catalogPort, opds1Adapter, secondAdapter],
  edges: [
    { from: catalogUseCases, to: catalogPort, label: 'calls' },
    { from: opds1Adapter, to: catalogPort, label: 'implements' },
    { from: secondAdapter, to: catalogPort, label: 'would implement' },
  ],
};

const libraryX = box(10, 40, 150, 'domain/x.ts');
const libraryW = box(10, 110, 150, 'domain/w.ts');
const recognitionY = box(200, 40, 150, 'domain/y.ts');
const recognitionZ = box(200, 110, 150, 'use-cases/z.ts');

const DOMAIN_CYCLE: DiagramSpec = {
  label:
    'library/domain/x.ts imports recognition/domain/y.ts, and recognition/use-cases/z.ts imports library/domain/w.ts. No module imports itself back, yet each domain depends on the other.',
  width: 360,
  height: 164,
  nodes: [
    { kind: 'group', x: 0, y: 0, width: 170, height: 164, label: 'library' },
    { kind: 'group', x: 190, y: 0, width: 170, height: 164, label: 'recognition' },
    libraryX,
    libraryW,
    recognitionY,
    recognitionZ,
  ],
  edges: [
    { from: libraryX, to: recognitionY },
    { from: recognitionZ, to: libraryW },
  ],
};

const storageDomain = box(0, 0, 184, 'storage', 'non-leaf', 'primary');
const libraryDomain = box(0, 110, 76, 'library', 'leaf');
const recognitionDomain = box(88, 110, 96, 'recognition', 'leaf');
const viewingDomain = box(196, 110, 76, 'viewing', 'leaf');
const flowingDomain = box(284, 110, 76, 'flowing', 'leaf');

const DOMAIN_GRAPH: DiagramSpec = {
  label:
    'storage imports library and recognition. The four leaves import no domain, and nothing imports storage.',
  width: 360,
  height: 154,
  nodes: [storageDomain, libraryDomain, recognitionDomain, viewingDomain, flowingDomain],
  edges: [
    { from: storageDomain, to: libraryDomain },
    { from: storageDomain, to: recognitionDomain },
  ],
};

const PATH_STEPS = [
  ['Save', 'ManageTagsScreen.svelte'],
  ['ManageTags.rename', 'view model'],
  ['renameTagMutation', 'through writeQuery'],
  ['recognition.renameTag', 'the container'],
  ['renameTag', 'use case'],
  ['TagRepository', 'port: list, save'],
  ['createTagRepository', 'adapter'],
  ['IndexedDB', 'recognition › tags'],
] as const;

const pathBoxes = PATH_STEPS.map(([label, detail], index) =>
  box(70, index * 62, 220, label, detail, index === 4 || index === 5 ? 'primary' : undefined),
);

const REQUEST_PATH: DiagramSpec = {
  label:
    'A press on Save in ManageTagsScreen calls ManageTags.rename, which runs the rename mutation through writeQuery. The mutation calls recognition.renameTag on the container, which runs the renameTag use case with the TagRepository port, implemented by createTagRepository over the recognition database in IndexedDB.',
  width: 360,
  height: (PATH_STEPS.length - 1) * 62 + 44,
  nodes: pathBoxes,
  edges: pathBoxes.slice(1).flatMap((to, index) => {
    const from = pathBoxes[index];
    return from === undefined ? [] : [{ from, to }];
  }),
};

const MAP_ROWS: Readonly<Record<string, readonly [number, number, number]>> = {
  routes: [0, 0, 360],
  container: [1, 0, 174],
  composition: [1, 186, 174],
  storage: [2, 0, 112],
  catalog: [2, 124, 112],
  docs: [2, 248, 112],
  library: [3, 0, 174],
  viewing: [3, 186, 174],
  flowing: [4, 0, 174],
  recognition: [4, 186, 174],
  shared: [5, 0, 112],
  platform: [5, 124, 112],
  workers: [5, 248, 112],
  components: [6, 0, 360],
};

const MAP_STEP = 60;

function reachDetail(reach: AreaReach): string {
  return match(reach)
    .with('all', () => 'may import')
    .with('some', () => 'partly')
    .with('none', () => 'forbidden')
    .exhaustive();
}

function mapBox(verdicts: AreaVerdicts, chosen: MapArea): DiagramBox {
  const [row, x, width] = MAP_ROWS[verdicts.area.id] ?? [0, 0, 360];
  if (verdicts.area.id === chosen.id) {
    return box(x, row * MAP_STEP, width, verdicts.area.label, 'importing', 'primary');
  }
  const reach = areaReach(verdicts);
  return box(
    x,
    row * MAP_STEP,
    width,
    verdicts.area.label,
    reachDetail(reach),
    reach === 'none' ? undefined : 'accent',
  );
}

function importMapDiagram(chosen: MapArea, verdicts: readonly AreaVerdicts[]): DiagramSpec {
  return {
    label: `What ${chosen.label} may import: ${verdicts
      .filter((area) => area.area.id !== chosen.id)
      .map((area) => `${area.area.label} ${reachDetail(areaReach(area))}`)
      .join(', ')}.`,
    width: 360,
    height: 6 * MAP_STEP + 44,
    nodes: verdicts.map((area) => mapBox(area, chosen)),
    edges: [],
  };
}

export {
  CATALOG_SOURCE,
  DOMAIN_CYCLE,
  DOMAIN_GRAPH,
  LAYERS,
  MAP_ROWS,
  PORT_AND_ADAPTERS,
  REQUEST_PATH,
  importMapDiagram,
  reachDetail,
};
export type { DiagramSpec };
