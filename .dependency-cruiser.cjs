const LEAF_DOMAINS = ['library', 'viewing', 'flowing', 'recognition'];
const LEAF_DOMAIN_PATH = `^src/lib/domains/(${LEAF_DOMAINS.join('|')})/`;

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
        'A concrete adapter is a choice of technology, and only the composition root is allowed to make that choice: src/lib/container.ts and the per-domain builders it calls in src/lib/composition/. Everything else — a route, a use case, a UI module, another domain — depends on the port in domain/ and receives the adapter it was handed. The one other exemption is an adapter reaching a sibling adapter in its OWN domain, which is how a decorator wraps the thing it decorates. This rule is why the domain barrel is gone: a barrel re-exported the adapters, and dependency-cruiser works at module granularity, so it could not tell an importer that took the port from one that took the adapter.',
      severity: 'error',
      from: {
        path: '^src/lib/domains/([^/]+)/adapters/|^src/',
        pathNot: ['^src/lib/container\\.ts$', '^src/lib/composition/'],
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
      name: 'queries-know-no-ui-or-wiring',
      comment:
        "A domain's queries/ folder holds its query keys and the factories that return queryOptions: a key and a call to a use case the caller hands in. It sits between use-cases/ and ui/, so it may import its own domain/ for types, shared/ and npm, and it may not import any ui/ (its own included, since ui/ imports queries/), any adapters/, container.ts or context.ts. A factory types its parameter structurally as the use cases it calls, so a spec passes a plain object and the composition root stays above it.",
      severity: 'error',
      from: { path: '^src/lib/domains/[^/]+/queries/' },
      to: {
        path: [
          '^src/lib/domains/[^/]+/(ui|adapters)/',
          '^src/lib/container\\.ts$',
          '^src/lib/context\\.ts$',
        ],
      },
    },

    {
      name: 'queries-call-use-cases-they-are-handed',
      comment:
        "A query factory calls a use case through the parameter it is given, never by importing the use case's module, so the container stays the one place a use case is wired to its dependencies. A type-only import from use-cases/ (an error type a use case declares) is allowed.",
      severity: 'error',
      from: { path: '^src/lib/domains/[^/]+/queries/' },
      to: {
        path: '^src/lib/domains/[^/]+/use-cases/',
        dependencyTypesNot: ['type-only'],
      },
    },

    {
      name: 'only-ui-reads-queries',
      comment:
        "queries/ sits above use-cases/ and below ui/, so only a ui/ module (and another file in queries/) may import it. A domain/, use-cases/ or adapters/ file that imported a query would point the layering upward. Another domain's queries/ is already refused by cross-domain-contract-only, and a route's by routes-are-thin.",
      severity: 'error',
      from: { path: '^src/lib/domains/[^/]+/(domain|use-cases|adapters)/' },
      to: { path: '^src/lib/domains/[^/]+/queries/' },
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
        "Domains form a directed acyclic graph, and this rule is what makes the cycle impossible rather than merely discouraged. library, viewing, flowing and recognition are leaves, named once in LEAF_DOMAINS at the top of this file: each imports no other domain at all. storage (what the origin holds, which needs recognition to tell a model's cached files from the runtime's) is the non-leaf, and it may import a leaf's domain/ and use-cases/, so nothing ever points back at it. cross-domain-contract-only is not enough on its own, because it permits library -> recognition and recognition -> library at the same time, and no-circular cannot see that: a cycle between two DOMAINS need not be a cycle between two MODULES, since library/domain/x -> recognition/domain/y and recognition/use-cases/z -> library/domain/w are two acyclic module edges and one cyclic domain relationship. The back-reference exempts a leaf from itself, so a sibling import inside one domain stays legal. When a screen needs two domains, the route composes them and passes a snippet as a prop; a domain never reaches for another domain to render it.",
      severity: 'error',
      from: { path: LEAF_DOMAIN_PATH },
      to: {
        path: '^src/lib/domains/',
        pathNot: '^src/lib/domains/$1/',
      },
    },

    {
      name: 'non-leaves-import-only-leaves',
      comment:
        "The other half of the domain DAG. leaf-domains-are-independent stops a leaf from importing any domain, but on its own it says nothing about a non-leaf importing another non-leaf, so a second non-leaf beside storage could import storage while storage imported it: a domain cycle that no-circular cannot see, for the same reason as above. A file in a non-leaf domain may therefore import only its own domain and the leaves. Every domain folder not listed in LEAF_DOMAINS counts as a non-leaf, so a new domain is held to this rule until it is deliberately added to the leaf list. With both rules, every domain edge runs from a non-leaf to a leaf and no edge ends at a non-leaf, so a domain cycle is impossible. The back-reference $1 is the importing non-leaf's own name, captured by from.path, so a sibling import inside one domain stays legal.",
      severity: 'error',
      from: {
        path: '^src/lib/domains/([^/]+)/',
        pathNot: LEAF_DOMAIN_PATH,
      },
      to: {
        path: '^src/lib/domains/',
        pathNot: ['^src/lib/domains/$1/', LEAF_DOMAIN_PATH],
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
        'A route is a delivery concern at the very end of the DAG: it pulls a view model out of context and renders a component. It may import container.ts, context.ts and query-client.ts (the composition root — container.ts assembles the adapters, context.ts hands the assembled container to the tree, query-client.ts builds the one query cache the root layout provides), the shared kernel, style sheets and static assets, a base component from src/lib/components/, and a domain ui/ module. Nothing else under src/lib. A route must never reach a port, a use case, an adapter, or a platform module: logic that a route can reach is logic that is not under test.',
      severity: 'error',
      from: { path: '^src/routes/' },
      to: {
        path: '^src/lib/',
        pathNot: [
          '^src/lib/container\\.ts$',
          '^src/lib/context\\.ts$',
          '^src/lib/query-client\\.ts$',
          '^src/lib/shared/',
          '^src/lib/styles/',
          '^src/lib/assets/',
          '^src/lib/components/',
          '^src/lib/domains/[^/]+/ui/',
        ],
      },
    },

    {
      name: 'base-components-know-no-app',
      comment:
        "src/lib/components/ is the base UI library: domain-free atoms that a route or a domain ui/ module composes into a screen. It may import static assets, its own siblings and npm packages, and nothing else under src/lib — not even the shared kernel, because shared/ holds UI that more than one domain composes from these atoms (PageBar), so shared sits above the library and an import back down would open a cycle. A base component that reached a domain, container.ts, context.ts or platform/ would carry that knowledge into every screen that renders it, and would turn the library's place at the bottom of the UI into a cycle the moment that domain's ui/ composed it. Behaviour a base component needs arrives as a prop, a snippet or a callback; the caller decides what it means.",
      severity: 'error',
      from: { path: '^src/lib/components/' },
      to: {
        path: '^src/lib/',
        pathNot: ['^src/lib/components/', '^src/lib/assets/'],
      },
    },

    {
      name: 'icons-are-imported-one-by-one',
      comment:
        'Each icon is its own module, imported by its own path ($lib/components/icons/X.svelte), so only the icons a screen names reach the build. An index module in icons/ would re-export the whole set: one import of it would ship every icon, and it would be the barrel this project forbids. The unused-icon spec in icons/ keeps the other half: no icon file exists that nothing imports.',
      severity: 'error',
      from: {},
      to: { path: '^src/lib/components/icons/index\\.' },
    },

    {
      name: 'only-the-pdf-adapter-loads-pdfjs',
      comment:
        "pdf.js ships a modern build and a legacy build, and library/adapters/pdf-page-source.ts chooses one at runtime by feature detection and loads only that build's library and worker. A static, dynamic or type import of pdfjs-dist, or of any path inside it, from any other module would fix a build in advance or put one in a chunk the other kind of browser fetches, so only the adapter may import it. The worker is named as new URL('pdfjs-dist/...', import.meta.url), which dependency-cruiser does not see as an edge; library/adapters/pdf-build-entries.spec.ts holds that form, and which build each entry belongs to.",
      severity: 'error',
      from: { pathNot: '^src/lib/domains/library/adapters/pdf-page-source\\.ts$' },
      to: { path: '(^|/)node_modules/(pdfjs-dist|.*/pdfjs-dist)/' },
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
    exclude: { path: '^(\\.svelte-kit|build)/' },

    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    tsPreCompilationDeps: true,

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.svelte'],
    },
  },
};
