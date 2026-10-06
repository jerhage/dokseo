import type {
  DiagramBox,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
} from '$lib/ui/components/diagram';

type DiagramSpec = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
};

const MAP_COLUMNS = [0, 190] as const;

function storeGroup(column: 0 | 1, y: number, rows: number, label: string): DiagramGroup {
  return {
    kind: 'group',
    x: MAP_COLUMNS[column],
    y,
    width: 170,
    height: 34 + rows * 58,
    label,
  };
}

function storeBox(group: DiagramGroup, row: number, label: string, detail: string): DiagramBox {
  return {
    kind: 'box',
    x: group.x + 10,
    y: group.y + 34 + row * 58,
    width: 150,
    height: 44,
    label,
    detail,
  };
}

const indexedDb = storeGroup(0, 0, 3, 'IndexedDB');
const opfs = storeGroup(1, 0, 2, 'OPFS');
const cacheApi = storeGroup(1, 160, 2, 'Cache API');
const localStore = storeGroup(0, 218, 1, 'localStorage');

const DATA_MAP: DiagramSpec = {
  label:
    'IndexedDB holds three databases: reader for books and removed books, recognition for captures, tags and the model setup, flowing for EPUB reading settings. The origin private file system holds the blobs folder with book files and covers, and the partials folder with paused downloads. The Cache API holds transformers-cache with the weights and runtime, and the reader-shell cache with the app shell. localStorage holds fourteen reader keys of preferences.',
  width: 360,
  height: 306,
  nodes: [
    indexedDb,
    opfs,
    cacheApi,
    localStore,
    { ...storeBox(indexedDb, 0, 'reader', 'books, removed books'), tone: 'primary' },
    { ...storeBox(indexedDb, 1, 'recognition', 'captures, tags, model'), tone: 'primary' },
    storeBox(indexedDb, 2, 'flowing', 'EPUB reading settings'),
    { ...storeBox(opfs, 0, 'blobs/', 'book files, covers'), tone: 'primary' },
    storeBox(opfs, 1, 'partials/', 'paused downloads'),
    storeBox(cacheApi, 0, 'transformers-cache', 'weights, runtime'),
    storeBox(cacheApi, 1, 'reader-shell-…', 'the app shell'),
    storeBox(localStore, 0, 'reader.* keys', '14 preferences'),
  ],
  edges: [],
};

const EVICTION_ROWS = [10, 100, 190, 280] as const;

function evictionBox(column: 0 | 1, row: 0 | 1 | 2 | 3, label: string, detail: string): DiagramBox {
  return {
    kind: 'box',
    x: column === 0 ? 10 : 200,
    y: EVICTION_ROWS[row],
    width: 150,
    height: 50,
    label,
    detail,
  };
}

const pressure = evictionBox(0, 0, 'Storage pressure', 'disk low or over limit');
const oldest = evictionBox(0, 1, 'Oldest-used origin', 'least recently used');
const persistent = {
  ...evictionBox(0, 2, 'Persistent?', 'granted by persist()'),
  tone: 'accent',
} as const;
const wholeOrigin = {
  ...evictionBox(0, 3, 'Delete the origin', 'every store, at once'),
  tone: 'primary',
} as const;
const skipped = evictionBox(1, 2, 'Skip it', 'take the next origin');
const unvisited = evictionBox(1, 0, 'Safari, in a tab', '7 days used, no visit');
const scriptData = {
  ...evictionBox(1, 1, 'Delete script data', 'IndexedDB, caches'),
  tone: 'primary',
} as const;

const EVICTION_DECISION: DiagramSpec = {
  label:
    'Under storage pressure the browser takes the least recently used origin. If it is persistent, it is skipped and the next origin is taken; if not, the whole origin is deleted at once. Separately, Safari deletes the script-written data of a site that had no visit in seven days of Safari use.',
  width: 360,
  height: 340,
  nodes: [pressure, oldest, persistent, wholeOrigin, skipped, unvisited, scriptData],
  edges: [
    { from: pressure, to: oldest },
    { from: oldest, to: persistent },
    { from: persistent, to: wholeOrigin, label: 'no' },
    { from: persistent, to: skipped, label: 'yes' },
    { from: unvisited, to: scriptData },
  ],
};

export { DATA_MAP, EVICTION_DECISION };
export type { DiagramSpec };
