import type { SourceSnippet } from '../ocr/ocr-snippets';
import type { RenameArm } from './rename-rehearsal';

const TAG_PORT: SourceSnippet = {
  label: 'The tag port',
  file: 'src/lib/domains/recognition/domain/tag/tag-repository.ts',
  code: `interface TagRepository {
  list(): Promise<TagListing>;
  save(tag: Tag): Promise<TagWrite>;
  remove(tag: TagId): Promise<TagWrite>;
}`,
};

const RENAME_RESULT: SourceSnippet = {
  label: 'The rename outcomes',
  file: 'src/lib/domains/recognition/use-cases/tag/rename-tag.ts',
  code: `type RenameTagResult =
  | { readonly kind: 'success'; readonly tag: Tag }
  | { readonly kind: 'name-taken'; readonly tag: Tag }
  | StorageUnavailable;`,
};

const RENAME_USE_CASE: SourceSnippet = {
  label: 'The renameTag use case',
  file: 'src/lib/domains/recognition/use-cases/tag/rename-tag.ts',
  code: `type RenameTagDeps = {
  readonly tags: TagRepository;
};

async function renameTag(deps: RenameTagDeps, tag: Tag, name: string): Promise<RenameTagResult> {
  const existing = await deps.tags.list();
  if (existing.kind !== 'success') return existing;

  const taken = existing.tags.find((other) => other.id !== tag.id && sameTagName(other.name, name));
  if (taken !== undefined) return { kind: 'name-taken', tag: taken };

  const renamed = renamedTag(tag, name);
  const stored = await deps.tags.save(renamed);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', tag: renamed };
}`,
};

const TAG_ADAPTER: SourceSnippet = {
  label: 'The IndexedDB adapter, list and save',
  file: 'src/lib/domains/recognition/adapters/tag/indexeddb-tags.repo.ts',
  code: `async list(): Promise<TagListing> {
  if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
  const records = await listRecords<StoredTag>(await recognitionDatabase(), TAG_STORE);
  const { tags, unreadable } = tagsFromStored(records);
  return { kind: 'success', tags: byName(tags), unreadable };
},

async save(tag: Tag): Promise<TagWrite> {
  if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
  await putRecord(await recognitionDatabase(), TAG_STORE, tag);
  return WRITTEN;
},`,
};

const BUILD_CONTAINER: SourceSnippet = {
  label: 'src/lib/container.ts',
  file: 'src/lib/container.ts',
  code: `function buildContainer(): Container {
  const repository = createLibraryRepository();
  const captures = createCaptureRepository();
  const removedBooks = buildRemovedBooks(repository, captures);
  const bookExports = buildBookCapturesExports(repository, captures);

  return {
    beginTrace,
    library: {
      ...buildLibrary(repository, removedBooks.mergeIntoBook),
      ...removedBooks,
      ...bookExports,
    },
    flowing: buildFlowing(),
    recognition: { ...buildRecognition(captures), ...bookExports },
    storage: {
      ...buildStorage(),
      ...buildCapturesExports(repository, captures),
      ...buildCapturesImports(repository, captures),
    },
  };
}`,
};

const BUILD_TAGS: SourceSnippet = {
  label: 'Wiring the tag use cases, in composition/recognition-tags.ts',
  file: 'src/lib/composition/recognition-tags.ts',
  code: `function buildTags(captures: CaptureRepository): TagUseCases {
  const tags = createTagRepository();

  return {
    listTags: () => listTags({ tags }),
    createTag: (id: TagId, name: string) => createTag({ tags, now: Date.now }, id, name),
    addTagToCapture: (capture: Capture, tag: TagId) => addTagToCapture({ captures }, capture, tag),
    removeTagFromCapture: (capture: Capture, tag: TagId) =>
      removeTagFromCapture({ captures }, capture, tag),
    renameTag: (tag: Tag, name: string) => renameTag({ tags }, tag, name),`,
};

const USE_CONTAINER: SourceSnippet = {
  label: 'src/lib/context.ts',
  file: 'src/lib/context.ts',
  code: `function useContainer(): Container {
  const container = getContext<Container | undefined>(CONTAINER);
  if (container === undefined) {
    throw new Error('No container in context. Call provideContainer() in the root layout first.');
  }
  return container;
}`,
};

const MANAGE_ROUTE: SourceSnippet = {
  label: 'src/routes/tags/manage/+page.svelte builds the view model',
  file: 'src/routes/tags/manage/+page.svelte',
  code: `const manage = new ManageTagsView(container.recognition, notify);`,
};

const RENAME_MUTATION: SourceSnippet = {
  label: 'The mutation factory, in recognition/queries/tag-queries.ts',
  file: 'src/lib/domains/recognition/queries/tag-queries.ts',
  code: `function renameTagMutation(recognition: Pick<TagWrites, 'renameTag'>) {
  return mutationOptions({
    mutationFn: ({ tag, name }: TagRename) => recognition.renameTag(tag, name),
  });
}`,
};

const RENAME_METHOD: SourceSnippet = {
  label: 'ManageTagsView.rename',
  file: 'src/lib/domains/recognition/ui/tag/manage-tags.svelte.ts',
  code: `async rename(tag: Tag): Promise<void> {
  if (tagName(this.draft).length === 0) {
    this.invalid = NAMELESS;
    return;
  }

  const generation = ++this.#generation;
  const written = await this.#renaming.run({ tag, name: this.draft }).catch(() => null);

  if (generation !== this.#generation) return;

  if (written === null) return;

  match(written)
    .with({ kind: 'success' }, () => {
      this.renaming = null;
      this.draft = '';
      this.invalid = null;
    })
    .with({ kind: 'name-taken' }, (taken) => {
      this.invalid = \`\${taken.tag.name} already holds that name.\`;
    })
    .with({ kind: 'storage-unavailable' }, () => {
      this.#fail(RENAME_FAILED, TAGS_UNCHANGEABLE);
    })
    .exhaustive();
}`,
};

const MANAGE_FILE = 'src/lib/domains/recognition/ui/tag/manage-tags.svelte.ts';

const RENAME_ARMS: Readonly<Record<RenameArm, SourceSnippet>> = {
  nameless: {
    label: 'The view model stops before the use case',
    file: MANAGE_FILE,
    code: `if (tagName(this.draft).length === 0) {
  this.invalid = NAMELESS;
  return;
}`,
  },
  success: {
    label: 'The success arm',
    file: MANAGE_FILE,
    code: `.with({ kind: 'success' }, () => {
  this.renaming = null;
  this.draft = '';
  this.invalid = null;
})`,
  },
  'name-taken': {
    label: 'The name-taken arm',
    file: MANAGE_FILE,
    code: `.with({ kind: 'name-taken' }, (taken) => {
  this.invalid = \`\${taken.tag.name} already holds that name.\`;
})`,
  },
  'storage-unavailable': {
    label: 'The storage-unavailable arm',
    file: MANAGE_FILE,
    code: `.with({ kind: 'storage-unavailable' }, () => {
  this.#fail(RENAME_FAILED, TAGS_UNCHANGEABLE);
})`,
  },
  thrown: {
    label: 'The mutation’s onError',
    file: MANAGE_FILE,
    code: `onError: (cause) => this.#fail(RENAME_FAILED, failureMessage(cause)),`,
  },
};

const RENAME_TEXTS: SourceSnippet = {
  label: 'The texts the view model shows',
  file: MANAGE_FILE,
  code: `const NAMELESS = 'A tag needs a name.';

const RENAME_FAILED = 'Could not rename that tag';`,
};

const UNCHANGEABLE_TEXT: SourceSnippet = {
  label: 'The blocked-storage text',
  file: MANAGE_FILE,
  code: `const TAGS_UNCHANGEABLE = 'This browser blocks local storage, so tags cannot be changed.';`,
};

const VIEW_MODEL_SPEC: SourceSnippet = {
  label: 'A view model test that runs in Node',
  file: 'src/lib/domains/recognition/ui/tag/manage-tags.spec.ts',
  code: `it('refuses a draft that is only whitespace, so a tag never loses its name', async () => {
  const manage = managing();
  manage.startRename(SFX);
  manage.draft = '   ';
  await manage.rename(SFX);

  expect(manage.invalid).toBe('A tag needs a name.');
  expect(manage.renaming).toBe(SFX.id);
});`,
};

const QUERY_CLIENT: SourceSnippet = {
  label: 'src/lib/query-client.ts',
  file: 'src/lib/query-client.ts',
  code: `function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
        gcTime: GC_TIME_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        networkMode: 'always',
      },
      mutations: { retry: 0, networkMode: 'always' },
    },
  });
}`,
};

const STORAGE_QUERY: SourceSnippet = {
  label: 'The query factory, in storage/queries/storage-queries.ts',
  file: 'src/lib/domains/storage/queries/storage-queries.ts',
  code: `function storageAccountQuery(storage: StorageReads) {
  return queryOptions({
    queryKey: storageKeys.account(),
    queryFn: async () => {
      const read = await storage.readStorageAccount();
      return read.account;
    },
    staleTime: 0,
  });
}`,
};

const STORAGE_DATA: SourceSnippet = {
  label: 'The data component, StorageData.svelte',
  file: 'src/lib/domains/storage/ui/StorageData.svelte',
  code: `const account = readQuery(() => storageAccountQuery(storage));
const state = $derived(account.state);`,
};

const READ_STATE: SourceSnippet = {
  label: 'shared/read-state.ts',
  file: 'src/lib/shared/read-state.ts',
  code: `type ReadState<T> =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready'; readonly value: T };`,
};

const LOAD_MANGA_OCR: SourceSnippet = {
  label: 'A dynamic import in composition/recognizers.ts',
  file: 'src/lib/composition/recognizers.ts',
  code: `async function loadMangaOcrRecognizer(language: Language): Promise<TextRecognizer> {
  const { createMangaOcrRecognizer } =
    await import('../domains/recognition/adapters/engine/manga-ocr.adapter');
  return createMangaOcrRecognizer(noticesFor(language));
}`,
};

const LEAF_LIST: SourceSnippet = {
  label: '.dependency-cruiser.cjs, the leaf list',
  file: '.dependency-cruiser.cjs',
  code: `const LEAF_DOMAINS = ['library', 'viewing', 'flowing', 'recognition'];
const LEAF_DOMAIN_PATH = \`^src/lib/domains/(\${LEAF_DOMAINS.join('|')})/\`;`,
};

const LEAF_RULE: SourceSnippet = {
  label: '.dependency-cruiser.cjs, leaf-domains-are-independent without its comment',
  file: '.dependency-cruiser.cjs',
  code: `from: { path: LEAF_DOMAIN_PATH },
to: {
  path: '^src/lib/domains/',
  pathNot: '^src/lib/domains/$1/',
},`,
};

const BRAND: SourceSnippet = {
  label: 'A brand, in shared/ids.ts',
  file: 'src/lib/shared/ids.ts',
  code: `function bookId(value: string): BookId {
  return value as BookId;
}

function parsedBookId(raw: string): BookId | null {
  const flat = raw.length > 0 && !raw.includes('/') && !raw.includes('\\\\') && !raw.includes('..');
  return flat ? bookId(raw) : null;
}`,
};

const WORKER_BOUNDARY: SourceSnippet = {
  label: 'A library boundary, in src/workers/ocr.worker.ts',
  file: 'src/workers/ocr.worker.ts',
  code: `function workerScope(): WorkerScope {
  return self as unknown as WorkerScope;
}

function sessionsOf(opened: Record<string, unknown>): Record<string, InferenceSession | undefined> {
  return opened as Record<string, InferenceSession | undefined>;
}

function logitsOf(output: unknown): DecoderLogits {
  return output as DecoderLogits;
}`,
};

const ADDED_VARIANT = `  | { readonly kind: 'name-too-long'; readonly limit: number }`;

const STORAGE_LINE = '  | StorageUnavailable;';

const WIDENED_RESULT = RENAME_RESULT.code.replace(
  STORAGE_LINE,
  `${ADDED_VARIANT}\n${STORAGE_LINE}`,
);

const NON_EXHAUSTIVE_ERROR = `error TS2349: This expression is not callable.
  Type 'NonExhaustiveError<{ readonly kind: "name-too-long"; readonly limit: number; }>' has no call signatures.`;

const IF_CHAIN = `if (written.kind === 'success') {
  this.renaming = null;
} else if (written.kind === 'name-taken') {
  this.invalid = \`\${written.tag.name} already holds that name.\`;
} else {
  this.#fail(RENAME_FAILED, TAGS_UNCHANGEABLE);
}`;

const ARCHITECTURE_SNIPPETS: readonly SourceSnippet[] = [
  TAG_PORT,
  RENAME_RESULT,
  RENAME_USE_CASE,
  TAG_ADAPTER,
  BUILD_CONTAINER,
  BUILD_TAGS,
  USE_CONTAINER,
  MANAGE_ROUTE,
  RENAME_MUTATION,
  RENAME_METHOD,
  ...Object.values(RENAME_ARMS),
  RENAME_TEXTS,
  UNCHANGEABLE_TEXT,
  VIEW_MODEL_SPEC,
  QUERY_CLIENT,
  STORAGE_QUERY,
  STORAGE_DATA,
  READ_STATE,
  LOAD_MANGA_OCR,
  LEAF_LIST,
  LEAF_RULE,
  BRAND,
  WORKER_BOUNDARY,
];

export {
  ADDED_VARIANT,
  ARCHITECTURE_SNIPPETS,
  BRAND,
  BUILD_CONTAINER,
  BUILD_TAGS,
  IF_CHAIN,
  LEAF_LIST,
  LEAF_RULE,
  LOAD_MANGA_OCR,
  MANAGE_ROUTE,
  NON_EXHAUSTIVE_ERROR,
  QUERY_CLIENT,
  READ_STATE,
  RENAME_ARMS,
  RENAME_METHOD,
  RENAME_MUTATION,
  RENAME_RESULT,
  RENAME_TEXTS,
  RENAME_USE_CASE,
  STORAGE_DATA,
  STORAGE_LINE,
  STORAGE_QUERY,
  TAG_ADAPTER,
  TAG_PORT,
  UNCHANGEABLE_TEXT,
  USE_CONTAINER,
  VIEW_MODEL_SPEC,
  WIDENED_RESULT,
  WORKER_BOUNDARY,
};
