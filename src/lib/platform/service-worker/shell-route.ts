type ShellRoute =
  | { readonly kind: 'pass-through' }
  | { readonly kind: 'cache-first' }
  | { readonly kind: 'network-first' };

type ShellRequest = {
  readonly method: string;
  readonly mode: string;
  readonly url: string;
};

type ShellScope = {
  readonly origin: string;
  readonly base: string;
  readonly precached: ReadonlySet<string>;
};

const PASS_THROUGH: ShellRoute = { kind: 'pass-through' };

function isImmutableBuildFile(pathname: string, base: string): boolean {
  return pathname.startsWith(`${base}/_app/immutable/`);
}

function shellRoute(request: ShellRequest, scope: ShellScope): ShellRoute {
  if (request.method !== 'GET') return PASS_THROUGH;

  const url = new URL(request.url);
  if (url.origin !== scope.origin) return PASS_THROUGH;
  if (request.mode === 'navigate') return { kind: 'network-first' };
  if (isImmutableBuildFile(url.pathname, scope.base) || scope.precached.has(url.pathname))
    return { kind: 'cache-first' };

  return PASS_THROUGH;
}

export { shellRoute };
export type { ShellRequest, ShellRoute, ShellScope };
