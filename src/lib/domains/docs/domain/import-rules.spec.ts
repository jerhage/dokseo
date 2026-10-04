import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PATH_RULES, UNPORTED_RULES, refusingRules, sourcePath } from './import-rules';
import type { ImportKind } from './import-rules';

type CruiserRule = {
  readonly name: string;
  readonly comment?: string;
  readonly severity?: string;
  readonly from: object;
  readonly to: object;
};

type Verdict = { readonly valid: boolean; readonly rules?: readonly { readonly name: string }[] };

type Validate = (
  ruleSet: object,
  from: { readonly source: string },
  to: {
    readonly resolved: string;
    readonly dependencyTypes: readonly string[];
    readonly circular: boolean;
    readonly couldNotResolve: boolean;
  },
) => Verdict;

const requireFromRoot = createRequire(resolve('package.json'));

const config = requireFromRoot('./.dependency-cruiser.cjs') as {
  readonly forbidden: readonly CruiserRule[];
};

async function cruiserValidator(): Promise<{
  readonly validate: Validate;
  readonly rules: object;
}> {
  const validation = (await import(
    resolve('node_modules/dependency-cruiser/src/validate/index.mjs')
  )) as { readonly validateDependency: Validate };
  const normalizing = (await import(
    resolve('node_modules/dependency-cruiser/src/main/rule-set/normalize.mjs')
  )) as { readonly default: (ruleSet: object) => object };
  return {
    validate: validation.validateDependency,
    rules: normalizing.default({ forbidden: config.forbidden }),
  };
}

const DOMAIN_FOLDERS = ['domain', 'use-cases', 'adapters', 'queries', 'ui'] as const;

const DOMAINS = ['library', 'recognition', 'viewing', 'storage', 'docs', 'sync'] as const;

const SAMPLE_PATHS = [
  'src/routes/+page.svelte',
  'src/routes/read/[fileId]/read-session.svelte.ts',
  'src/lib/container.ts',
  'src/lib/context.ts',
  'src/lib/query-client.ts',
  'src/lib/composition/library.ts',
  'src/lib/shared/ids.ts',
  'src/lib/platform/idb/connection.ts',
  'src/lib/components/Button.svelte',
  'src/lib/components/icons/Check.svelte',
  'src/lib/components/icons/index.ts',
  'src/lib/styles/index.css',
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

function cruiserTypes(kind: ImportKind): readonly string[] {
  return kind === 'type-only' ? ['local', 'type-only', 'import'] : ['local', 'import'];
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
    const { validate, rules } = await cruiserValidator();
    const disagreements: string[] = [];

    for (const from of SAMPLE_PATHS) {
      for (const to of SAMPLE_PATHS) {
        for (const kind of KINDS) {
          const verdict = validate(
            rules,
            { source: from },
            {
              resolved: to,
              dependencyTypes: cruiserTypes(kind),
              circular: false,
              couldNotResolve: false,
            },
          );
          const theirs = (verdict.rules ?? []).map((rule) => rule.name).join(',');
          const ours = refusingRules(from, to, kind).join(',');
          if (theirs !== ours)
            disagreements.push(`${from} -> ${to} (${kind}): ${theirs} / ${ours}`);
        }
      }
    }

    expect(disagreements).toEqual([]);
  });

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
