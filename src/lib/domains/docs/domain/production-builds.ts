type ResourceSize = {
  readonly name: string;
  readonly initiatorType: string;
  readonly transferSize: number;
  readonly encodedBodySize: number;
  readonly decodedBodySize: number;
};

type ResourceKind = {
  readonly initiatorType: string;
  readonly count: number;
  readonly decodedBytes: number;
};

type LoadedResource = {
  readonly path: string;
  readonly decodedBytes: number;
  readonly cached: boolean;
};

type LoadSummary = {
  readonly count: number;
  readonly decodedBytes: number;
  readonly transferredBytes: number;
  readonly kinds: readonly ResourceKind[];
  readonly largest: readonly LoadedResource[];
};

const KILO = 1000;

const MEGA = KILO * KILO;

const LARGEST_SHOWN = 8;

function byteFigure(bytes: number): string {
  if (bytes < KILO) return `${bytes.toLocaleString('en-US')} B`;
  if (bytes < MEGA) return `${(bytes / KILO).toFixed(1)} kB`;
  return `${(bytes / MEGA).toFixed(2)} MB`;
}

function exactBytes(bytes: number): string {
  return `${bytes.toLocaleString('en-US')} bytes`;
}

function pathOf(name: string, origin: string): string {
  const url = URL.parse(name);
  if (url === null || url.origin !== origin) return name;
  return `${url.pathname}${url.search}`;
}

function wasCached(entry: ResourceSize): boolean {
  return entry.transferSize === 0 && entry.decodedBodySize > 0;
}

function sameOrigin(entry: ResourceSize, origin: string): boolean {
  return URL.parse(entry.name)?.origin === origin;
}

function kindsOf(entries: readonly ResourceSize[]): readonly ResourceKind[] {
  const groups = Map.groupBy(entries, (entry) => entry.initiatorType);
  return Array.from(groups, ([initiatorType, members]) => ({
    initiatorType,
    count: members.length,
    decodedBytes: members.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
  })).toSorted((a, b) => b.count - a.count || a.initiatorType.localeCompare(b.initiatorType));
}

function loadSummary(entries: readonly ResourceSize[], origin: string): LoadSummary {
  const local = entries.filter((entry) => sameOrigin(entry, origin));
  return {
    count: local.length,
    decodedBytes: local.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
    transferredBytes: local.reduce((sum, entry) => sum + entry.transferSize, 0),
    kinds: kindsOf(local),
    largest: local
      .toSorted((a, b) => b.decodedBodySize - a.decodedBodySize)
      .slice(0, LARGEST_SHOWN)
      .map((entry) => ({
        path: pathOf(entry.name, origin),
        decodedBytes: entry.decodedBodySize,
        cached: wasCached(entry),
      })),
  };
}

export { LARGEST_SHOWN, byteFigure, exactBytes, loadSummary };
export type { LoadSummary, LoadedResource, ResourceKind, ResourceSize };
