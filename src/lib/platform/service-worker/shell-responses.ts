import { match } from 'ts-pattern';

type NavigationOutcome =
  | { readonly kind: 'answered'; readonly response: Response }
  | { readonly kind: 'failed' }
  | { readonly kind: 'slow' };

type NavigationSources = {
  readonly network: () => Promise<Response>;
  readonly shell: () => Promise<Response | undefined>;
  readonly patience: () => Promise<void>;
};

type CacheFirstSources = {
  readonly cached: () => Promise<Response | undefined>;
  readonly network: () => Promise<Response>;
  readonly keep: (response: Response) => Promise<void>;
};

const KEPT_STATUS = 200;

async function shellOr(
  shell: () => Promise<Response | undefined>,
  otherwise: () => Response | Promise<Response>,
): Promise<Response> {
  const cached = await shell();
  return cached ?? otherwise();
}

async function navigationResponse(sources: NavigationSources): Promise<Response> {
  const network = sources.network();
  const outcome = await Promise.race<NavigationOutcome>([
    network.then(
      (response) => ({ kind: 'answered', response }),
      () => ({ kind: 'failed' }),
    ),
    sources.patience().then(() => ({ kind: 'slow' })),
  ]);

  return match(outcome)
    .with({ kind: 'answered' }, ({ response }) => response)
    .with({ kind: 'failed' }, () => shellOr(sources.shell, () => Response.error()))
    .with({ kind: 'slow' }, () =>
      shellOr(sources.shell, () => network.catch(() => Response.error())),
    )
    .exhaustive();
}

async function cacheFirstResponse(sources: CacheFirstSources): Promise<Response> {
  const cached = await sources.cached();
  if (cached !== undefined) return cached;

  const response = await sources.network();
  if (response.status === KEPT_STATUS) await sources.keep(response.clone()).catch(() => undefined);
  return response;
}

export { cacheFirstResponse, navigationResponse };
export type { CacheFirstSources, NavigationOutcome, NavigationSources };
