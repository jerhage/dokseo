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
      name: 'cross-domain-through-the-barrel',
      comment:
        "A domain's public API is its index.ts. Reaching past it into domain/, use-cases/, adapters/ or ui/ of another domain couples you to that domain's internals and makes the barrel a lie. Import the barrel.",
      severity: 'error',
      from: { path: '^src/lib/domains/([^/]+)/' },
      to: {
        path: '^src/lib/domains/',
        pathNot: ['^src/lib/domains/$1/', '^src/lib/domains/[^/]+/index\\.ts$'],
      },
    },

    {
      name: 'routes-are-thin',
      comment:
        'A route is a delivery concern at the very end of the DAG. It may import a domain barrel and the shared kernel, and nothing else — no adapter, no platform module, no use case reached past its barrel. Style sheets and static assets under src/lib/styles and src/lib/assets are exempt: they carry no logic. container.ts and context.ts are the composition root — container.ts assembles the adapters and context.ts hands the assembled container to the tree — and they are the only non-barrel modules a route may reach.',
      severity: 'error',
      from: { path: '^src/routes/' },
      to: {
        path: '^src/lib/',
        pathNot: [
          '^src/lib/domains/[^/]+/index\\.ts$',
          '^src/lib/shared/',
          '^src/lib/styles/',
          '^src/lib/assets/',
          '^src/lib/container\\.ts$',
          '^src/lib/context\\.ts$',
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
