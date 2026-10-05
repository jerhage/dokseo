import type { SourceSnippet } from '../ocr/ocr-snippets';

const TURN_SPEC: SourceSnippet = {
  label: 'From src/lib/shared/turn-settings.spec.ts',
  file: 'src/lib/shared/turn-settings.spec.ts',
  code: `function device(...matching: readonly string[]): MediaMatches {
  return (query) => matching.includes(query);
}

const touchOnly = { touchTurns: true, edgeClicks: false };`,
};

const TURN_SPEC_CASE: SourceSnippet = {
  label: 'One row of the table, and the assertion every row runs',
  file: 'src/lib/shared/turn-settings.spec.ts',
  code: `['a phone', device('(any-pointer: coarse)'), 'touch', touchOnly],`,
};

const TURN_SPEC_ASSERT: SourceSnippet = {
  label: 'The assertion',
  file: 'src/lib/shared/turn-settings.spec.ts',
  code: `'names the pointers of %s and shows the turn settings it can use',
(_name, matches, kinds, shown) => {
  expect(pointerKinds(matches)).toBe(kinds);
  expect(shownTurnSettings(matches)).toEqual(shown);
},`,
};

const CREATE_TAG_DOUBLE: SourceSnippet = {
  label: 'The hand-written port in create-tag.spec.ts',
  file: 'src/lib/domains/recognition/use-cases/tag/create-tag.spec.ts',
  code: `function repository(rows: readonly Tag[], fault: StoreFault = 'none') {
  const saved: Tag[] = [];
  const tags: TagRepository = {
    list: () => {
      if (fault === 'listing') return Promise.resolve(STORAGE_UNAVAILABLE);
      return Promise.resolve({ kind: 'success' as const, tags: rows, unreadable: [] });
    },
    save: (tag: Tag) => {
      if (fault === 'saving') {
        return Promise.resolve(STORAGE_UNAVAILABLE);
      }
      saved.push(tag);
      return Promise.resolve({ kind: 'success' as const });
    },
    remove: () => Promise.resolve({ kind: 'success' as const }),
  };

  return { tags, saved };
}`,
};

const DECISION_OF: SourceSnippet = {
  label: 'decisionOf, in recognition/domain/model/model-consent.ts',
  file: 'src/lib/domains/recognition/domain/model/model-consent.ts',
  code: `function decisionOf(
  consent: ModelConsent | null,
  model: ModelFootprint | null,
): ModelConsentDecision {
  if (consent === null || model === null) return 'undecided';
  if (!reads(model, consent.language)) return 'undecided';

  return consent.modelId === model.modelId ? 'granted' : 'undecided';
}`,
};

const VITEST_PROJECTS: SourceSnippet = {
  label: 'The two projects, in vite.config.ts',
  file: 'vite.config.ts',
  code: `test: {
  expect: { requireAssertions: true },
  projects: [
    {
      extends: './vite.config.ts',
      test: {
        name: 'unit',
        environment: 'node',
        setupFiles: ['src/lib/shared/testing/fresh-local-storage.ts'],
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
      },
    },

    {
      extends: './vite.config.ts',
      test: {
        name: 'browser',
        fileParallelism: false,
        browser: {
          enabled: true,
          provider: playwright(),
          instances: [{ browser: 'chromium', headless: true }],
        },
        include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
      },
    },
  ],
},`,
};

const FRESH_LOCAL_STORAGE: SourceSnippet = {
  label: 'The setup file, src/lib/shared/testing/fresh-local-storage.ts',
  file: 'src/lib/shared/testing/fresh-local-storage.ts',
  code: `beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});`,
};

const VERIFY_SCRIPTS: SourceSnippet = {
  label: 'The verify scripts, in package.json',
  file: 'package.json',
  code: `"test": "vitest --run --project unit && vitest --run --project browser",
"test:watch": "vitest",
"test:ci": "vitest --run --project unit",
"verify:static": "npm run check && npm run lint && npm run format:check && npm run lint:deps",
"verify:tests": "npm run verify:static && npm run test",
"verify": "npm run verify:tests && npm run build",
"verify:ci": "npm run verify:static && npm run test:ci && npm run build",`,
};

const CI_STEP: SourceSnippet = {
  label: 'The last step of .github/workflows/ci.yml',
  file: '.github/workflows/ci.yml',
  code: `- run: deno install --frozen

- run: deno task verify:ci`,
};

const OBSERVED_READ: SourceSnippet = {
  label: 'src/lib/shared/testing/observed-read.ts',
  file: 'src/lib/shared/testing/observed-read.ts',
  code: `function observedRead<T, K extends QueryKey>(
  client: QueryClient,
  options: QueryObserverOptions<T, DefaultError, T, T, K>,
): Promise<ReadState<T>> {
  const observer = new QueryObserver(client, options);

  return new Promise((resolve) => {
    let unsubscribe = (): void => undefined;
    const settle = (result: QueryObserverResult<T>): void => {
      if (result.fetchStatus === 'fetching') return;
      unsubscribe();
      resolve(readStateOf(result));
    };
    unsubscribe = observer.subscribe(settle);
    settle(observer.getCurrentResult());
  });
}`,
};

const QUERY_SPEC: SourceSnippet = {
  label: 'A query factory test, in library/queries/library-queries.spec.ts',
  file: 'src/lib/domains/library/queries/library-queries.spec.ts',
  code: `it('resolves a blocked store as an answer, so the shelf can name it', async () => {
  const client = createTestQueryClient();

  const listed = await observedRead(
    client,
    booksQuery({ listBooks: () => Promise.resolve(STORAGE_UNAVAILABLE) }),
  );

  expect(listed).toEqual(readReady(STORAGE_UNAVAILABLE));
});`,
};

const WRITE_QUERY_MOCK: SourceSnippet = {
  label: 'Replacing writeQuery, in recognition/ui/tag/manage-tags.spec.ts',
  file: 'src/lib/domains/recognition/ui/tag/manage-tags.spec.ts',
  code: `vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/idle-write-query'));`,
};

const IDLE_WRITE_QUERY: SourceSnippet = {
  label: 'src/lib/shared/testing/idle-write-query.ts',
  file: 'src/lib/shared/testing/idle-write-query.ts',
  code: `function writeQuery<R, V>(): WriteQuery<R, V> {
  return {
    state: { kind: 'idle' },
    submit: () => undefined,
    run: () => new Promise<R>(() => undefined),
    reset: () => undefined,
  };
}`,
};

const SOURCE_WALKER: SourceSnippet = {
  label: 'Listing the source files, in app-rules/source-styling.spec.ts',
  file: 'src/app-rules/source-styling.spec.ts',
  code: `function sourceFiles(extensions: readonly string[]): readonly string[] {
  return readdirSync(SOURCE, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(fileURLToPath(SOURCE), join(entry.parentPath, entry.name)))
    .map((path) => path.split('\\\\').join('/'))
    .filter((path) => !path.startsWith(LIBRARY_FOLDER))
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .toSorted();
}`,
};

const STYLE_BLOCK_TEST: SourceSnippet = {
  label: 'A rule as a test, in app-rules/source-styling.spec.ts',
  file: 'src/app-rules/source-styling.spec.ts',
  code: `it('has no <style> block in any Svelte file outside the docs', () => {
  const offenders = sourceFiles(['.svelte'])
    .filter((path) => !path.startsWith(DOCS_FOLDER))
    .filter((path) => /<style[\\s>]/u.test(read(path)));

  expect(offenders).toEqual([]);
});`,
};

const TOUCH_TURN_TAP: SourceSnippet = {
  label: 'A finger tap, in flowing/ui/flow-touch-turn.svelte.spec.ts',
  file: 'src/lib/domains/flowing/ui/flow-touch-turn.svelte.spec.ts',
  code: `async function tapWithAFinger(share: number): Promise<void> {
  const doc = showing().doc;
  const at = fingerAt(doc, share);
  touch(doc, 'touchstart', at);
  pointer(doc, 'pointerdown', at);
  pointer(doc, 'pointerup', at);
  touch(doc, 'touchend', at);
  await rests();
}`,
};

const TOUCH_TURN_TEST: SourceSnippet = {
  label: 'The first of its two tests',
  file: 'src/lib/domains/flowing/ui/flow-touch-turn.svelte.spec.ts',
  code: `it('leaves the next tap free to turn a page', async () => {
  await opened();
  await onTheLastPageOfTheFirstChapter();

  await tapWithAFinger(FORWARD_EDGE);
  await expect.poll(() => showing().index, { timeout: MOVED_WITHIN_MS }).toBe(SECOND_CHAPTER);
  const arrived = paginator().page;

  await tapWithAFinger(FORWARD_EDGE);

  expect(paginator().page).toBeGreaterThan(arrived);
});`,
};

const SETTLES: SourceSnippet = {
  label: 'The fixed rest',
  file: 'src/lib/domains/flowing/ui/flow-touch-turn.svelte.spec.ts',
  code: `const SETTLES_MS = 400;`,
};

const RECOGNIZERS_SPEC: SourceSnippet = {
  label: 'src/lib/composition/recognizers.spec.ts',
  file: 'src/lib/composition/recognizers.spec.ts',
  code: `it('resolves a recognizer of its own for each language', async () => {
  expect((await recognizerFor('ja')).id).toBe('manga-ocr');
  expect((await recognizerFor('ko')).id).toBe('paddle-ocr');
  expect((await recognizerFor('ja')).id).toBe('manga-ocr');
});`,
};

const RUNE_MODULE = `class Plan {
  items = $state([]);
  count = $derived(this.items.length);
}
$effect.root(() => { $effect(() => console.log('ran')); });
export { Plan };`;

const SERVER_OUTPUT = `class Plan {
	items = [];
	#count = $.derived(() => this.items.length);`;

const CLIENT_OUTPUT = `class Plan {
	#items = $.state($.proxy([]));`;

const CLIENT_EFFECT = `$.effect_root(() => {
	$.user_effect(() => console.log('ran'));
});`;

const TESTING_SNIPPETS: readonly SourceSnippet[] = [
  TURN_SPEC,
  TURN_SPEC_CASE,
  TURN_SPEC_ASSERT,
  CREATE_TAG_DOUBLE,
  DECISION_OF,
  VITEST_PROJECTS,
  FRESH_LOCAL_STORAGE,
  VERIFY_SCRIPTS,
  CI_STEP,
  OBSERVED_READ,
  QUERY_SPEC,
  WRITE_QUERY_MOCK,
  IDLE_WRITE_QUERY,
  SOURCE_WALKER,
  STYLE_BLOCK_TEST,
  TOUCH_TURN_TAP,
  TOUCH_TURN_TEST,
  SETTLES,
  RECOGNIZERS_SPEC,
];

export {
  CI_STEP,
  CLIENT_EFFECT,
  CLIENT_OUTPUT,
  CREATE_TAG_DOUBLE,
  DECISION_OF,
  FRESH_LOCAL_STORAGE,
  IDLE_WRITE_QUERY,
  OBSERVED_READ,
  QUERY_SPEC,
  RECOGNIZERS_SPEC,
  RUNE_MODULE,
  SERVER_OUTPUT,
  SETTLES,
  SOURCE_WALKER,
  STYLE_BLOCK_TEST,
  TESTING_SNIPPETS,
  TOUCH_TURN_TAP,
  TOUCH_TURN_TEST,
  TURN_SPEC,
  TURN_SPEC_ASSERT,
  TURN_SPEC_CASE,
  VERIFY_SCRIPTS,
  VITEST_PROJECTS,
  WRITE_QUERY_MOCK,
};
