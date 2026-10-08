import { match } from 'ts-pattern';
import type { CatalogProtocol } from '../domains/catalog/domain/catalog-protocol';
import type { CatalogSource } from '../domains/catalog/domain/catalog-source';

async function loadOpds1Source(): Promise<CatalogSource> {
  const [{ HttpCatalogClient }, { Opds1CatalogSource }] = await Promise.all([
    import('../domains/catalog/adapters/http-catalog-client'),
    import('../domains/catalog/adapters/opds1/opds1-catalog-source'),
  ]);
  const http = new HttpCatalogClient(
    (url, init) => globalThis.fetch(url, init),
    () => navigator.onLine,
  );
  return new Opds1CatalogSource(http);
}

const sources = new Map<CatalogProtocol, Promise<CatalogSource>>();

function catalogSourceFor(protocol: CatalogProtocol): Promise<CatalogSource> {
  const held = sources.get(protocol);
  if (held !== undefined) return held;

  const loading = match(protocol)
    .with('opds1', () => loadOpds1Source())
    .exhaustive()
    .catch((cause: unknown): never => {
      sources.delete(protocol);
      throw cause;
    });

  sources.set(protocol, loading);
  return loading;
}

export { catalogSourceFor, sources };
