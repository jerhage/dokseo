type RulePattern = string | readonly string[];

type PathRule = {
  readonly name: string;
  readonly from: { readonly path?: RulePattern; readonly pathNot?: RulePattern };
  readonly to: {
    readonly path?: RulePattern;
    readonly pathNot?: RulePattern;
    readonly dependencyTypesNot?: readonly string[];
  };
};

type ImportKind = 'value' | 'type-only';

const LEAF_DOMAINS = ['library', 'viewing', 'flowing', 'recognition'] as const;

const LEAF_DOMAIN_PATH = `^src/lib/domains/(${LEAF_DOMAINS.join('|')})/`;

const DOCS_DOMAIN_PATH = '^src/lib/domains/docs/';

const UNPORTED_RULES = ['no-circular', 'no-unresolvable'] as const;

const PATH_RULES: readonly PathRule[] = [
  {
    name: 'only-the-container-builds-adapters',
    from: {
      path: '^src/lib/domains/([^/]+)/adapters/|^src/',
      pathNot: ['^src/lib/container\\.ts$', '^src/lib/composition/', DOCS_DOMAIN_PATH],
    },
    to: {
      path: '^src/lib/domains/[^/]+/adapters/',
      pathNot: '^src/lib/domains/$1/adapters/',
    },
  },
  {
    name: 'domain-ring-is-pure',
    from: { path: '^src/lib/domains/([^/]+)/domain/', pathNot: DOCS_DOMAIN_PATH },
    to: {
      path: '^src/lib/domains/',
      pathNot: '^src/lib/domains/$1/domain/',
    },
  },
  {
    name: 'queries-know-no-ui-or-wiring',
    from: { path: '^src/lib/domains/[^/]+/queries/', pathNot: DOCS_DOMAIN_PATH },
    to: {
      path: [
        '^src/lib/domains/[^/]+/(ui|adapters)/',
        '^src/lib/container\\.ts$',
        '^src/lib/context\\.ts$',
        '^src/lib/composition/',
      ],
    },
  },
  {
    name: 'queries-call-use-cases-they-are-handed',
    from: { path: '^src/lib/domains/[^/]+/queries/', pathNot: DOCS_DOMAIN_PATH },
    to: {
      path: '^src/lib/domains/[^/]+/use-cases/',
      dependencyTypesNot: ['type-only'],
    },
  },
  {
    name: 'only-ui-reads-queries',
    from: {
      path: '^src/lib/domains/[^/]+/(domain|use-cases|adapters)/',
      pathNot: DOCS_DOMAIN_PATH,
    },
    to: { path: '^src/lib/domains/[^/]+/queries/' },
  },
  {
    name: 'cross-domain-contract-only',
    from: { path: '^src/lib/domains/([^/]+)/', pathNot: DOCS_DOMAIN_PATH },
    to: {
      path: '^src/lib/domains/',
      pathNot: [
        '^src/lib/domains/$1/',
        '^src/lib/domains/[^/]+/domain/',
        '^src/lib/domains/[^/]+/use-cases/',
      ],
    },
  },
  {
    name: 'leaf-domains-are-independent',
    from: { path: LEAF_DOMAIN_PATH },
    to: {
      path: '^src/lib/domains/',
      pathNot: '^src/lib/domains/$1/',
    },
  },
  {
    name: 'non-leaves-import-only-leaves',
    from: {
      path: '^src/lib/domains/([^/]+)/',
      pathNot: [LEAF_DOMAIN_PATH, DOCS_DOMAIN_PATH],
    },
    to: {
      path: '^src/lib/domains/',
      pathNot: ['^src/lib/domains/$1/', LEAF_DOMAIN_PATH],
    },
  },
  {
    name: 'domains-know-no-wiring-or-routes',
    from: { path: '^src/lib/domains/', pathNot: DOCS_DOMAIN_PATH },
    to: {
      path: ['^src/routes/', '^src/lib/container\\.ts$', '^src/lib/composition/'],
      dependencyTypesNot: ['type-only'],
    },
  },
  {
    name: 'the-base-layers-know-no-domain',
    from: { path: '^src/lib/(shared|platform)/' },
    to: { path: '^src/lib/domains/' },
  },
  {
    name: 'routes-are-thin',
    from: { path: '^src/routes/' },
    to: {
      path: '^src/lib/',
      pathNot: [
        '^src/lib/container\\.ts$',
        '^src/lib/context\\.ts$',
        '^src/lib/query-client\\.ts$',
        '^src/lib/shared/',
        '^src/lib/ui/',
        '^src/lib/assets/',
        '^src/lib/domains/[^/]+/ui/',
        DOCS_DOMAIN_PATH,
      ],
    },
  },
  {
    name: 'nothing-imports-docs',
    from: { pathNot: [DOCS_DOMAIN_PATH, '^src/routes/docs/'] },
    to: { path: DOCS_DOMAIN_PATH },
  },
  {
    name: 'base-components-know-no-app',
    from: { path: '^src/lib/ui/' },
    to: {
      path: ['^src/', '(^|/)node_modules/'],
      pathNot: ['^src/lib/ui/', '(^|/)node_modules/(svelte|ts-pattern|vitest)/'],
    },
  },
  {
    name: 'icons-are-imported-one-by-one',
    from: {},
    to: { path: '^src/lib/ui/components/icons/index\\.' },
  },
  {
    name: 'only-the-pdf-adapter-loads-pdfjs',
    from: {
      pathNot: ['^src/lib/domains/library/adapters/pdf-page-source\\.ts$', DOCS_DOMAIN_PATH],
    },
    to: { path: '(^|/)node_modules/(pdfjs-dist|.*/pdfjs-dist)/' },
  },
];

function joinedPattern(pattern: RulePattern): string {
  return typeof pattern === 'string' ? pattern : pattern.join('|');
}

function capturedGroups(pattern: RulePattern | undefined, source: string): readonly string[] {
  if (pattern === undefined) return [];
  const found = new RegExp(joinedPattern(pattern)).exec(source);
  if (found === null || found.length <= 1) return [];
  return found.filter((group): group is string => typeof group === 'string');
}

function withGroups(pattern: RulePattern, groups: readonly string[]): RegExp {
  const filled = groups.reduce(
    (text, group, index) => text.replaceAll(new RegExp(`\\$${index}`, 'g'), group),
    joinedPattern(pattern),
  );
  return new RegExp(filled);
}

function dependencyTypes(kind: ImportKind): readonly string[] {
  return kind === 'type-only' ? ['local', 'import', 'type-only'] : ['local', 'import'];
}

function ruleRefuses(rule: PathRule, from: string, to: string, kind: ImportKind): boolean {
  if (rule.from.path !== undefined && !new RegExp(joinedPattern(rule.from.path)).test(from)) {
    return false;
  }
  if (rule.from.pathNot !== undefined && new RegExp(joinedPattern(rule.from.pathNot)).test(from)) {
    return false;
  }
  const groups = capturedGroups(rule.from.path, from);
  if (rule.to.path !== undefined && !withGroups(rule.to.path, groups).test(to)) return false;
  if (rule.to.pathNot !== undefined && withGroups(rule.to.pathNot, groups).test(to)) return false;
  const excluded = rule.to.dependencyTypesNot;
  if (excluded !== undefined && dependencyTypes(kind).some((type) => excluded.includes(type))) {
    return false;
  }
  return true;
}

function refusingRules(
  from: string,
  to: string,
  kind: ImportKind,
  rules: readonly PathRule[] = PATH_RULES,
): readonly string[] {
  return rules.filter((rule) => ruleRefuses(rule, from, to, kind)).map((rule) => rule.name);
}

function sourcePath(raw: string): string {
  const trimmed = raw.trim().replace(/^\.?\/+/u, '');
  if (trimmed.startsWith('$lib/')) return `src/lib/${trimmed.slice('$lib/'.length)}`;
  if (trimmed.startsWith('$workers/')) return `src/workers/${trimmed.slice('$workers/'.length)}`;
  return trimmed;
}

export {
  DOCS_DOMAIN_PATH,
  LEAF_DOMAINS,
  LEAF_DOMAIN_PATH,
  PATH_RULES,
  UNPORTED_RULES,
  dependencyTypes,
  refusingRules,
  sourcePath,
};
export type { ImportKind, PathRule, RulePattern };
