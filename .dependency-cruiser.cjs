module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment:
        'A cycle means the two modules are really one module with a seam drawn in the wrong place. Split the shared part out, or merge them.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },

    {
      name: 'only-the-container-builds-adapters',
      comment:
        'A concrete adapter is a choice of technology, and exactly one file is allowed to make that choice: src/lib/container.ts, the composition root. Everything else — a route, a use case, a UI module, another domain — depends on the port in domain/ and receives the adapter it was handed. The one other exemption is an adapter reaching a sibling adapter in its OWN domain, which is how a decorator wraps the thing it decorates. This rule is why the domain barrel is gone: a barrel re-exported the adapters, and dependency-cruiser works at module granularity, so it could not tell an importer that took the port from one that took the adapter.',
      severity: 'error',
      from: {
        path: '^src/lib/domains/([^/]+)/adapters/|^src/',
        pathNot: '^src/lib/container\\.ts$',
      },
      to: {
        path: '^src/lib/domains/[^/]+/adapters/',
        pathNot: '^src/lib/domains/$1/adapters/',
      },
    },

    {
      name: 'domain-ring-is-pure',
      comment:
        "A domain's domain/ folder is the innermost ring: ports, entities and value objects, plain TypeScript, testable in bare Node. It may not import an adapter, a use case, a UI module, or anything from another domain. If domain code needs something from outside, that something is a port it should declare, not a module it should import.",
      severity: 'error',
      from: { path: '^src/lib/domains/([^/]+)/domain/' },
      to: {
        path: '^src/lib/domains/',
        pathNot: '^src/lib/domains/$1/domain/',
      },
    },

    {
      name: 'cross-domain-contract-only',
      comment:
        "Another domain's contract is its domain/ folder and its use-cases/ folder: the types it speaks in and the operations it offers. Its adapters/ and its ui/ are internals, and importing one couples you to how that domain happens to be built today. The back-reference exempts a domain from itself — inside one domain every folder is fair game, subject to the other rules.",
      severity: 'error',
      from: { path: '^src/lib/domains/([^/]+)/' },
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
      comment:
        "Domains form a directed acyclic graph, and this rule is what makes the cycle impossible rather than merely discouraged. library, viewing, recognition and lexicon are leaves: each imports no other domain at all. reading (the selection-to-lookup flow) and storage (what the origin holds, which needs recognition to tell a model's cached files from the runtime's) are the non-leaves, and each may import a leaf's domain/ and use-cases/, so nothing ever points back at them. cross-domain-contract-only is not enough on its own, because it permits library -> recognition and recognition -> library at the same time, and no-circular cannot see that: a cycle between two DOMAINS need not be a cycle between two MODULES, since library/domain/x -> recognition/domain/y and recognition/use-cases/z -> library/domain/w are two acyclic module edges and one cyclic domain relationship. The back-reference exempts a leaf from itself, so a sibling import inside one domain stays legal. When a screen needs two domains, the route composes them and passes a snippet as a prop; a domain never reaches for another domain to render it.",
      severity: 'error',
      from: { path: '^src/lib/domains/(library|viewing|recognition|lexicon)/' },
      to: {
        path: '^src/lib/domains/',
        pathNot: '^src/lib/domains/$1/',
      },
    },

    {
      name: 'the-base-layers-know-no-domain',
      comment:
        'shared/ is the kernel and platform/ is technical capability with zero domain vocabulary, so neither may import a domain. Breaking this inverts the layering and opens a cycle that nothing else would catch: library -> shared -> recognition makes library depend on recognition transitively, with no rule firing and no module cycle for no-circular to find. If a kernel file needs a domain type, the type belongs in the kernel or the dependency belongs the other way round.',
      severity: 'error',
      from: { path: '^src/lib/(shared|platform)/' },
      to: { path: '^src/lib/domains/' },
    },

    {
      name: 'routes-are-thin',
      comment:
        'A route is a delivery concern at the very end of the DAG: it pulls a view model out of context and renders a component. It may import container.ts and context.ts (the composition root — container.ts assembles the adapters, context.ts hands the assembled container to the tree), the shared kernel, style sheets and static assets, and a domain ui/ module. Nothing else under src/lib. A route must never reach a port, a use case, an adapter, or a platform module: logic that a route can reach is logic that is not under test.',
      severity: 'error',
      from: { path: '^src/routes/' },
      to: {
        path: '^src/lib/',
        pathNot: [
          '^src/lib/container\\.ts$',
          '^src/lib/context\\.ts$',
          '^src/lib/shared/',
          '^src/lib/styles/',
          '^src/lib/assets/',
          '^src/lib/domains/[^/]+/ui/',
        ],
      },
    },

    {
      name: 'no-unresolvable',
      comment:
        "An import that does not resolve is invisible to every rule above, so a broken alias silently disables the architecture checks rather than failing loudly. $app and $env are SvelteKit's own virtual modules and are expected here.",
      severity: 'error',
      from: {},
      to: {
        couldNotResolve: true,
        pathNot: '^[$](app|env)/',
      },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(\\.svelte-kit|build|node_modules)/' },

    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    tsPreCompilationDeps: true,

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.svelte'],
    },
  },
};
