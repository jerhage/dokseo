type CachedFile = {
  readonly url: string;
  readonly bytes: number | null;
};

function isAvailable(): boolean {
  return typeof caches !== 'undefined';
}

function declaredSize(response: Response): number | null {
  const declared = response.headers.get('content-length');
  if (declared === null) return null;

  const bytes = Number.parseInt(declared, 10);
  return Number.isFinite(bytes) ? bytes : null;
}

async function bytesHeld(response: Response | undefined): Promise<number | null> {
  if (response === undefined) return null;

  try {
    return (await response.blob()).size;
  } catch {
    return declaredSize(response);
  }
}

async function filesIn(cache: Cache): Promise<readonly CachedFile[]> {
  const requests = await cache.keys();
  return await Promise.all(
    requests.map(async (request) => ({
      url: request.url,
      bytes: await bytesHeld(await cache.match(request)),
    })),
  );
}

async function cachedFiles(): Promise<readonly CachedFile[]> {
  const names = await caches.keys();
  const perCache = await Promise.all(names.map(async (name) => filesIn(await caches.open(name))));
  return perCache.flat();
}

async function removeCached(urls: readonly string[]): Promise<readonly string[]> {
  const removed: string[] = [];

  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    for (const url of urls) {
      if (await cache.delete(url)) removed.push(url);
    }
  }

  return removed;
}

export { isAvailable, cachedFiles, removeCached };
export type { CachedFile };
