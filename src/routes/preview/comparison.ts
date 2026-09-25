type Variant = {
  readonly label: string;
  readonly route: string;
  readonly within: string | null;
};

type ComparisonFill = 'page' | 'screen';

type Comparison = {
  readonly title: string;
  readonly fills: ComparisonFill;
  readonly variants: readonly Variant[];
};

type RouteParameters = Readonly<Record<string, string | undefined>>;

const PARAMETER = /^\[(\w+)\]$/u;

const IMAGE_READER: Comparison = {
  title: 'The image reader',
  fills: 'screen',
  variants: [
    { label: 'Current', route: '/read/[fileId]', within: null },
    { label: 'A', route: '/preview/a/read/[fileId]', within: '/preview/a' },
    { label: 'B', route: '/preview/b/read/[fileId]', within: '/preview/b' },
  ],
};

function activeComparison(): Comparison | null {
  return IMAGE_READER;
}

function parameterOf(segment: string): string | null {
  return PARAMETER.exec(segment)?.[1] ?? null;
}

function routeParameters(route: string): readonly string[] {
  return route.split('/').flatMap((segment) => {
    const name = parameterOf(segment);
    return name === null ? [] : [name];
  });
}

function variantHref(variant: Variant, parameters: RouteParameters, search = ''): string | null {
  const filled: string[] = [];

  for (const segment of variant.route.split('/')) {
    const name = parameterOf(segment);
    if (name === null) {
      filled.push(segment);
      continue;
    }

    const value = parameters[name];
    if (value === undefined || value === '') return null;
    filled.push(encodeURIComponent(value));
  }

  return `${filled.join('/')}${search}`;
}

function matchesRoute(route: string, pathname: string): boolean {
  const wanted = route.split('/');
  const given = pathname.split('/');
  if (wanted.length !== given.length) return false;

  return wanted.every((segment, at) => {
    const actual = given[at] ?? '';
    return parameterOf(segment) === null ? segment === actual : actual !== '';
  });
}

function isShowing(variant: Variant, pathname: string): boolean {
  if (variant.within === null) return matchesRoute(variant.route, pathname);

  return pathname === variant.within || pathname.startsWith(`${variant.within}/`);
}

export { activeComparison, isShowing, routeParameters, variantHref };
export type { Comparison, ComparisonFill, RouteParameters, Variant };
