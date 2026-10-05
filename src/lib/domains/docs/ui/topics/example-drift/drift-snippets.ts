import type { SourceSnippet } from '../ocr/ocr-snippets';

const SNIPPET_TYPE: SourceSnippet = {
  label: 'The type every quote has, in ocr/ocr-snippets.ts',
  file: 'src/lib/domains/docs/ui/topics/ocr/ocr-snippets.ts',
  code: `type SourceSnippet = {
  readonly label: string;
  readonly file: string;
  readonly code: string;
};`,
};

const QUOTED_SOURCE: SourceSnippet = {
  label: 'src/workers/ja-ocr-text.ts, the code being quoted',
  file: 'src/workers/ja-ocr-text.ts',
  code: `function jaOcrText(decoded: string): string {
  return decoded.replace(/\\s+/gu, '');
}`,
};

const QUOTE_ENTRY: SourceSnippet = {
  label: 'One entry in unicode/unicode-snippets.ts',
  file: 'src/lib/domains/docs/ui/topics/unicode/unicode-snippets.ts',
  code: `const OCR_TEXT: SourceSnippet = {
  label: 'src/workers/ja-ocr-text.ts',
  file: 'src/workers/ja-ocr-text.ts',
  code: \`function jaOcrText(decoded: string): string {
  return decoded.replace(/\\\\s+/gu, '');
}\`,
};`,
};

const QUOTE_RENDERED: SourceSnippet = {
  label: 'unicode/UnicodeInDokseo.svelte renders the entry',
  file: 'src/lib/domains/docs/ui/topics/unicode/UnicodeInDokseo.svelte',
  code: `<DocsCode label={OCR_TEXT.label} code={OCR_TEXT.code} />`,
};

const SNIPPET_SPEC: SourceSnippet = {
  label: 'ocr/ocr-snippets.spec.ts, the check one page runs',
  file: 'src/lib/domains/docs/ui/topics/ocr/ocr-snippets.spec.ts',
  code: `function unindented(code: string): string {
  return code
    .split('\\n')
    .map((line) => line.trimStart())
    .join('\\n');
}

describe('the OCR page snippets', () => {
  it.each(OCR_SNIPPETS.map((snippet) => [snippet.label, snippet] as const))(
    'quotes %s exactly as the source file has it',
    (_label, snippet) => {
      const source = readFileSync(snippet.file, 'utf8');

      expect(unindented(source)).toContain(unindented(snippet.code));
    },
  );
});`,
};

const DEMO_UNINDENTED: SourceSnippet = {
  label: 'docs/domain/quote-drift.ts, the copy the live check below runs',
  file: 'src/lib/domains/docs/domain/quote-drift.ts',
  code: `function unindented(code: string): string {
  return code
    .split('\\n')
    .map((line) => line.trimStart())
    .join('\\n');
}`,
};

const CI_TRIGGER: SourceSnippet = {
  label: '.github/workflows/ci.yml, when CI runs',
  file: '.github/workflows/ci.yml',
  code: `on:
  pull_request:
  push:
    branches: [main]`,
};

const CI_STEP: SourceSnippet = {
  label: '.github/workflows/ci.yml, the last step',
  file: '.github/workflows/ci.yml',
  code: `- run: deno install --frozen

- run: deno task verify:ci`,
};

const CI_SCRIPTS: SourceSnippet = {
  label: 'package.json, the scripts verify:ci runs',
  file: 'package.json',
  code: `"test:ci": "vitest --run --project unit",`,
};

const VERIFY_CI: SourceSnippet = {
  label: 'package.json, verify:ci',
  file: 'package.json',
  code: `"verify:ci": "npm run verify:static && npm run test:ci && npm run build",`,
};

const UNIT_PROJECT: SourceSnippet = {
  label: 'vite.config.ts, the unit project',
  file: 'vite.config.ts',
  code: `name: 'unit',
environment: 'node',
setupFiles: ['src/lib/shared/testing/fresh-local-storage.ts'],
include: ['src/**/*.{test,spec}.{js,ts}'],
exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],`,
};

const SQL_RERUN: SourceSnippet = {
  label: 'docs/domain/sql-examples.spec.ts runs every SQLite query again',
  file: 'src/lib/domains/docs/domain/sql-examples.spec.ts',
  code: `it.each(SQLITE_KEYS)('matches what SQLite returns for %s', (key) => {
  const example = Object.entries(SQL_EXAMPLES).find(([name]) => name === key)?.[1];
  const statement = sampleDatabase().prepare(example?.sql ?? '');
  statement.setReturnArrays(true);

  const rows = statement.all();

  expect(statement.columns().map((entry) => entry.name)).toEqual(example?.columns);
  expect(rows).toEqual(example?.rows);
});`,
};

const SQL_ENGINE: SourceSnippet = {
  label: 'docs/domain/sql-examples.spec.ts keeps the SQLite queries',
  file: 'src/lib/domains/docs/domain/sql-examples.spec.ts',
  code: `const SQLITE_KEYS = Object.entries(SQL_EXAMPLES)
  .filter(([, example]) => example.engine === 'sqlite')
  .map(([key]) => key);`,
};

const TSC_PRINT: SourceSnippet = {
  label: 'typescript-types/compiled-examples.spec.ts prints the errors as tsc does',
  file: 'src/lib/domains/docs/ui/topics/typescript-types/compiled-examples.spec.ts',
  code: `return [example.file, ts.formatDiagnostics(diagnostics, format).trimEnd()];`,
};

const TSC_COMPARE: SourceSnippet = {
  label: 'typescript-types/compiled-examples.spec.ts compares them with the recorded text',
  file: 'src/lib/domains/docs/ui/topics/typescript-types/compiled-examples.spec.ts',
  code: `it(
  'prints exactly the recorded errors when the installed TypeScript compiles each example',
  () => {
    const printed = compiledAll();

    expect(
      COMPILED_EXAMPLES.map((example) => ({
        file: example.file,
        errors: printed.get(example.file),
      })),
    ).toEqual(
      COMPILED_EXAMPLES.map((example) => ({ file: example.file, errors: example.errors })),
    );
  },
  COMPILE_TIMEOUT_MS,
);`,
};

const SVELTE_COMPILE: SourceSnippet = {
  label: 'testing/testing-snippets.spec.ts compiles the module again',
  file: 'src/lib/domains/docs/ui/topics/testing/testing-snippets.spec.ts',
  code: `function compiled(generate: 'server' | 'client'): string {
  return compileModule(RUNE_MODULE, { generate, filename: 'plan.svelte.js' }).js.code;
}`,
};

const SVELTE_SERVER: SourceSnippet = {
  label: 'testing/testing-snippets.spec.ts, the server build',
  file: 'src/lib/domains/docs/ui/topics/testing/testing-snippets.spec.ts',
  code: `const server = compiled('server');

expect(server).toContain(SERVER_OUTPUT);
expect(server).not.toContain('effect');
expect(server).not.toContain('proxy');`,
};

const ROLLDOWN_BUILD: SourceSnippet = {
  label: 'production-builds/bundle-samples.spec.ts builds a sample in memory',
  file: 'src/lib/domains/docs/ui/topics/production-builds/bundle-samples.spec.ts',
  code: `const result = await build({
  configFile: false,
  logLevel: 'silent',
  plugins: [sampleModules(sample)],
  build: {
    write: false,
    minify: sample.minify,
    rolldownOptions: { input: ENTRY },
  },
});`,
};

const ROLLDOWN_COMPARE: SourceSnippet = {
  label: 'production-builds/bundle-samples.spec.ts compares every chunk',
  file: 'src/lib/domains/docs/ui/topics/production-builds/bundle-samples.spec.ts',
  code: `it.each(BUNDLE_SAMPLES.map((sample) => [sample.id, sample] as const))(
  'records exactly what the installed Vite builds from %s',
  async (_id, sample) => {
    expect(await bundled(sample)).toEqual(sample.chunks);
  },
  BUNDLE_TIMEOUT_MS,
);`,
};

const BUILD_TOTALS: SourceSnippet = {
  label: 'production-builds/recorded-build.spec.ts, what it checks',
  file: 'src/lib/domains/docs/ui/topics/production-builds/recorded-build.spec.ts',
  code: `it.each([BUILD_WITH_PLUGIN, BUILD_WITHOUT_PLUGIN])(
  'adds its groups up to its totals',
  (build) => {
    expect(groupTotals(build)).toEqual({ files: build.files, bytes: build.bytes });
  },
);

it('records one emptied or guarded node for every dev-only route component in src/routes', () => {
  expect(BUILD_WITH_PLUGIN.stubNodes + BUILD_WITH_PLUGIN.guardNodes).toBe(
    devOnlyFilesNamed(ROUTE_COMPONENT),
  );
});`,
};

const OCR_RUN_END: SourceSnippet = {
  label: 'docs/domain/ocr-decoding.spec.ts, two checks on the recorded run',
  file: 'src/lib/domains/docs/domain/ocr-decoding.spec.ts',
  code: `it('ends on the end token', () => {
  const last = RECORDED_BUBBLE_RUN.steps.at(-1);

  expect(last?.candidates[0].id).toBe(RECORDED_BUBBLE_RUN.endToken);
});

it('grows the decoder input by one token per step', () => {
  const lengths = RECORDED_BUBBLE_RUN.steps.map((step) => step.prefixLength);

  expect(lengths).toEqual(lengths.map((_, index) => index + 1));
});`,
};

const COUNT_IN_MARKUP: SourceSnippet = {
  label: 'ocr/OcrConcepts.svelte counts the steps of its recorded run',
  file: 'src/lib/domains/docs/ui/topics/ocr/OcrConcepts.svelte',
  code: `Computed from the {run.steps.length} steps of the recorded run above.`,
};

const LINK_CHECK: SourceSnippet = {
  label: 'topics/docs-links.spec.ts checks the links instead',
  file: 'src/lib/domains/docs/ui/topics/docs-links.spec.ts',
  code: `it('resolves every hand-written link to a topic and one of its section titles', () => {
  expect(brokenLinks(SOURCE_LINKS)).toEqual([]);
});`,
};

const DRIFT_SNIPPETS: readonly SourceSnippet[] = [
  SNIPPET_TYPE,
  QUOTED_SOURCE,
  QUOTE_ENTRY,
  QUOTE_RENDERED,
  SNIPPET_SPEC,
  DEMO_UNINDENTED,
  CI_TRIGGER,
  CI_STEP,
  CI_SCRIPTS,
  VERIFY_CI,
  UNIT_PROJECT,
  SQL_RERUN,
  SQL_ENGINE,
  TSC_PRINT,
  TSC_COMPARE,
  SVELTE_COMPILE,
  SVELTE_SERVER,
  ROLLDOWN_BUILD,
  ROLLDOWN_COMPARE,
  BUILD_TOTALS,
  OCR_RUN_END,
  COUNT_IN_MARKUP,
  LINK_CHECK,
];

export {
  BUILD_TOTALS,
  CI_SCRIPTS,
  CI_STEP,
  CI_TRIGGER,
  COUNT_IN_MARKUP,
  DEMO_UNINDENTED,
  DRIFT_SNIPPETS,
  LINK_CHECK,
  OCR_RUN_END,
  QUOTED_SOURCE,
  QUOTE_ENTRY,
  QUOTE_RENDERED,
  ROLLDOWN_BUILD,
  ROLLDOWN_COMPARE,
  SNIPPET_SPEC,
  SNIPPET_TYPE,
  SQL_ENGINE,
  SQL_RERUN,
  SVELTE_COMPILE,
  SVELTE_SERVER,
  TSC_COMPARE,
  TSC_PRINT,
  UNIT_PROJECT,
  VERIFY_CI,
};
