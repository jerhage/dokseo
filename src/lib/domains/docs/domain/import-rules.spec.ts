import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, posix, resolve } from 'node:path';
import { cruise } from 'dependency-cruiser';
import type { ICruiseResult, IRegularForbiddenRuleType } from 'dependency-cruiser';
import { describe, expect, it } from 'vitest';
import { PATH_RULES, UNPORTED_RULES, refusingRules, sourcePath } from './import-rules';
import type { ImportKind } from './import-rules';

type CruiserConfig = {
  readonly forbidden: readonly (IRegularForbiddenRuleType & { readonly name: string })[];
  readonly options: { readonly enhancedResolveOptions: object };
};

const requireFromRoot = createRequire(resolve('package.json'));

const config = requireFromRoot('./.dependency-cruiser.cjs') as CruiserConfig;

const DOMAIN_FOLDERS = ['domain', 'use-cases', 'adapters', 'queries', 'ui'] as const;

const DOMAINS = ['library', 'recognition', 'viewing', 'storage', 'docs', 'sync'] as const;

const SAMPLE_PATHS = [
  'src/routes/+page.svelte',
  'src/routes/docs/storage/+page.svelte',
  'src/routes/read/[fileId]/read-session.svelte.ts',
  'src/lib/container.ts',
  'src/lib/context.ts',
  'src/lib/query-client.ts',
  'src/lib/composition/library.ts',
  'src/lib/shared/ids.ts',
  'src/lib/platform/idb/connection.ts',
  'src/lib/ui/components/Button.svelte',
  'src/lib/ui/components/icons/Check.svelte',
  'src/lib/ui/components/icons/index.ts',
  'src/lib/ui/core/styles/index.css',
  'src/lib/assets/logo.svg',
  'src/workers/ocr.worker.ts',
  'src/lib/domains/library/adapters/pdf-page-source.ts',
  'src/lib/domains/library/ui/index.ts',
  'node_modules/pdfjs-dist/build/pdf.mjs',
  ...DOMAINS.flatMap((domain) =>
    DOMAIN_FOLDERS.map((folder) => `src/lib/domains/${domain}/${folder}/sample.ts`),
  ),
];

const KINDS: readonly ImportKind[] = ['value', 'type-only'];

function importerOf(sample: string): string | null {
  if (sample.startsWith('node_modules/')) return null;
  return sample.endsWith('.ts') ? sample : `${sample}.ts`;
}

function importLine(from: string, to: string, kind: ImportKind): string {
  const relative = posix.relative(posix.dirname(from), to);
  const specifier = relative.startsWith('.') ? relative : `./${relative}`;
  return kind === 'type-only' ? `import type {} from '${specifier}';` : `import '${specifier}';`;
}

function writeSamples(root: string, kind: ImportKind): readonly string[] {
  const importers = SAMPLE_PATHS.flatMap((sample) => {
    const importer = importerOf(sample);
    return importer === null ? [] : [importer];
  });
  for (const path of new Set([...SAMPLE_PATHS, ...importers])) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    const lines = importers.includes(path)
      ? SAMPLE_PATHS.filter((to) => to !== path).map((to) => importLine(path, to, kind))
      : [];
    writeFileSync(join(root, path), lines.join('\n'));
  }
  return importers;
}

function ruleOrder(names: readonly string[]): string {
  const order = config.forbidden.map((rule) => rule.name);
  return names.toSorted((left, right) => order.indexOf(left) - order.indexOf(right)).join(',');
}

type CruiserVerdicts = {
  readonly edges: ReadonlySet<string>;
  readonly refused: ReadonlyMap<string, string>;
};

async function cruiserVerdicts(kind: ImportKind): Promise<CruiserVerdicts> {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'import-rules-')));
  try {
    const importers = writeSamples(root, kind);
    const forbidden = config.forbidden.filter(
      (rule) => !UNPORTED_RULES.some((name) => name === rule.name),
    );
    const { output } = await cruise([...importers], {
      baseDir: root,
      validate: true,
      ruleSet: { forbidden },
      doNotFollow: { path: 'node_modules' },
      tsPreCompilationDeps: true,
      enhancedResolveOptions: config.options.enhancedResolveOptions,
    });
    if (typeof output === 'string') throw new Error('dependency-cruiser returned text');
    return verdictsOf(output);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function verdictsOf(result: ICruiseResult): CruiserVerdicts {
  const edges = new Set(
    result.modules.flatMap((module) =>
      module.dependencies
        .filter((dependency) => !dependency.couldNotResolve)
        .map((dependency) => `${module.source} -> ${dependency.resolved}`),
    ),
  );
  const refused = new Map<string, string[]>();
  for (const violation of result.summary.violations) {
    const key = `${violation.from} -> ${violation.to}`;
    refused.set(key, [...(refused.get(key) ?? []), violation.rule.name]);
  }
  return {
    edges,
    refused: new Map([...refused].map(([key, names]) => [key, ruleOrder(names)])),
  };
}

describe('the ported path rules', () => {
  it('copies every rule dependency-cruiser holds except the two it cannot run on two paths', () => {
    const copied = config.forbidden
      .filter((rule) => !UNPORTED_RULES.some((name) => name === rule.name))
      .map(({ name, from, to }) => ({ name, from, to }));

    expect(PATH_RULES).toEqual(copied);
    expect(config.forbidden.map((rule) => rule.name)).toEqual(
      expect.arrayContaining([...UNPORTED_RULES]),
    );
  });

  it('refuses exactly what dependency-cruiser refuses for every pair of sample paths', async () => {
    const disagreements: string[] = [];

    for (const kind of KINDS) {
      const theirs = await cruiserVerdicts(kind);
      for (const from of SAMPLE_PATHS) {
        const importer = importerOf(from);
        if (importer === null) continue;
        for (const to of SAMPLE_PATHS) {
          if (to === importer) continue;
          const edge = `${importer} -> ${to}`;
          const cruised = theirs.edges.has(edge) ? (theirs.refused.get(edge) ?? '') : 'not cruised';
          const ours = ruleOrder(refusingRules(importer, to, kind));
          if (cruised !== ours) {
            disagreements.push(`${importer} -> ${to} (${kind}): ${cruised} / ${ours}`);
          }
        }
      }
    }

    expect(disagreements).toEqual([]);
  }, 60_000);

  it('refuses a route that reaches an adapter under two rules', () => {
    expect(
      refusingRules(
        'src/routes/+page.svelte',
        'src/lib/domains/library/adapters/indexeddb-opfs-library.repo.ts',
        'value',
      ),
    ).toEqual(['only-the-container-builds-adapters', 'routes-are-thin']);
  });

  it('passes a route that imports a barrel in a ui folder', () => {
    expect(
      refusingRules('src/routes/+page.svelte', 'src/lib/domains/library/ui/index.ts', 'value'),
    ).toEqual([]);
  });

  it('passes a type-only import of a use case from queries and refuses a value import', () => {
    const from = 'src/lib/domains/storage/queries/storage-queries.ts';
    const to = 'src/lib/domains/storage/use-cases/read-storage-account.ts';

    expect(refusingRules(from, to, 'type-only')).toEqual([]);
    expect(refusingRules(from, to, 'value')).toEqual(['queries-call-use-cases-they-are-handed']);
  });

  it('refuses one non-leaf importing another', () => {
    expect(
      refusingRules(
        'src/lib/domains/sync/ui/SyncPanel.svelte',
        'src/lib/domains/storage/domain/storage-parts.ts',
        'value',
      ),
    ).toEqual(['non-leaves-import-only-leaves']);
  });

  it('passes docs importing an adapter, the container and another domain ui', () => {
    const from = 'src/lib/domains/docs/ui/topics/Page.svelte';

    for (const to of [
      'src/lib/domains/storage/adapters/storage-account.ts',
      'src/lib/domains/storage/ui/StorageSummary.svelte',
      'src/lib/container.ts',
      'src/lib/composition/library.ts',
      'src/lib/platform/idb/connection.ts',
      'node_modules/pdfjs-dist/build/pdf.mjs',
    ]) {
      expect(refusingRules(from, to, 'value')).toEqual([]);
    }
  });

  it('refuses every module outside docs and its routes an import of docs', () => {
    const to = 'src/lib/domains/docs/domain/sample.ts';

    expect(refusingRules('src/lib/domains/storage/ui/StorageSummary.svelte', to, 'value')).toEqual([
      'non-leaves-import-only-leaves',
      'nothing-imports-docs',
    ]);
    expect(refusingRules('src/routes/+page.svelte', to, 'type-only')).toEqual([
      'nothing-imports-docs',
    ]);
    expect(refusingRules('src/routes/docs/storage/+page.svelte', to, 'value')).toEqual([]);
  });

  it('passes a worker that imports a use case', () => {
    expect(
      refusingRules(
        'src/workers/ocr.worker.ts',
        'src/lib/domains/recognition/use-cases/engine/recognize-region.ts',
        'value',
      ),
    ).toEqual([]);
  });
});

describe('sourcePath', () => {
  it('expands the $lib and $workers aliases and drops a leading ./', () => {
    expect(sourcePath(' $lib/shared/ids.ts ')).toBe('src/lib/shared/ids.ts');
    expect(sourcePath('$workers/ocr.worker.ts')).toBe('src/workers/ocr.worker.ts');
    expect(sourcePath('./src/routes/+page.svelte')).toBe('src/routes/+page.svelte');
  });
});
