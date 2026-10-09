import type { CatalogId } from '$lib/shared/ids';
import type { CatalogUseCases } from './catalog-deps';

async function forgetDangling(
  cases: Pick<CatalogUseCases, 'forgetDanglingOrigins'>,
  id: CatalogId,
  refreshOrigins: () => Promise<void>,
): Promise<void> {
  const forgotten = await cases.forgetDanglingOrigins(id);
  if (forgotten.kind === 'success' && forgotten.forgotten > 0) await refreshOrigins();
}

export { forgetDangling };
