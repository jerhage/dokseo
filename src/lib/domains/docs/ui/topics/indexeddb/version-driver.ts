const VERSIONS_NAME = 'dokseo-docs-indexeddb-versions';

type VersionConnection = { readonly version: number; close(): void };

type OpenAEvents = {
  readonly versionChange: (oldVersion: number, newVersion: number | null) => boolean;
};

type OpenBEvents = {
  readonly blocked: (oldVersion: number, newVersion: number | null) => void;
  readonly upgrade: (oldVersion: number, newVersion: number, created: readonly string[]) => void;
};

type VersionDriver = {
  current(): Promise<number | null>;
  openA(version: number | undefined, events: OpenAEvents): Promise<VersionConnection>;
  openB(version: number, events: OpenBEvents): Promise<number>;
  remove(blocked: () => void): Promise<void>;
};

function storeName(version: number): string {
  return `store-v${version}`;
}

function createEveryStore(db: IDBDatabase, version: number): readonly string[] {
  const created: string[] = [];
  for (let step = 1; step <= version; step += 1) {
    const name = storeName(step);
    if (!db.objectStoreNames.contains(name)) {
      db.createObjectStore(name);
      created.push(name);
    }
  }
  return created;
}

function opened(request: IDBOpenDBRequest): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });
}

async function current(): Promise<number | null> {
  if (typeof indexedDB.databases !== 'function') return null;
  const listed = await indexedDB.databases();
  return listed.find((info) => info.name === VERSIONS_NAME)?.version ?? 0;
}

async function openA(version: number | undefined, events: OpenAEvents): Promise<VersionConnection> {
  const request =
    version === undefined ? indexedDB.open(VERSIONS_NAME) : indexedDB.open(VERSIONS_NAME, version);
  request.addEventListener('upgradeneeded', (event) => {
    createEveryStore(request.result, event.newVersion ?? 1);
  });
  const db = await opened(request);
  db.addEventListener('versionchange', (event) => {
    if (events.versionChange(event.oldVersion, event.newVersion)) db.close();
  });
  return { version: db.version, close: () => db.close() };
}

async function openB(version: number, events: OpenBEvents): Promise<number> {
  const request = indexedDB.open(VERSIONS_NAME, version);
  request.addEventListener('blocked', (event) =>
    events.blocked(event.oldVersion, event.newVersion),
  );
  request.addEventListener('upgradeneeded', (event) => {
    const next = event.newVersion ?? version;
    events.upgrade(event.oldVersion, next, createEveryStore(request.result, next));
  });
  const db = await opened(request);
  const reached = db.version;
  db.close();
  return reached;
}

function remove(blocked: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(VERSIONS_NAME);
    request.addEventListener('blocked', blocked);
    request.addEventListener('success', () => resolve());
    request.addEventListener('error', () => reject(request.error));
  });
}

const BROWSER_VERSION_DRIVER: VersionDriver = { current, openA, openB, remove };

export { BROWSER_VERSION_DRIVER, VERSIONS_NAME, createEveryStore, storeName };
export type { OpenAEvents, OpenBEvents, VersionConnection, VersionDriver };
