type SourceSnippet = {
  readonly label: string;
  readonly file: string;
  readonly code: string;
};

const EXPORT_ROUNDS: SourceSnippet = {
  label: 'prepare and save in BookCapturesExport',
  file: 'src/lib/shared/book-captures-export.svelte.ts',
  code: `async prepare(book: BookId): Promise<void> {
  this.#round += 1;
  const round = this.#round;
  this.#state = PREPARING;
  try {
    const read = await this.#exporting.exportBookCaptures(book);
    if (round === this.#round) this.#state = preparedState(read);
  } catch (error) {
    if (round === this.#round) this.#state = UNPREPARED;
    throw error;
  }
}

async save(): Promise<void> {
  const exported = heldFile(this.#state);
  if (exported === null) return;
  const round = this.#round;
  this.#state = { kind: 'saving', exported };
  try {
    const outcome = await this.#save(exported.file);
    if (round === this.#round) this.#state = settledState(outcome, exported);
  } catch (error) {
    if (round === this.#round) this.#state = { kind: 'ready', exported };
    throw error;
  }
}`,
};

const READER_PICTURE: SourceSnippet = {
  label: 'A page picture that arrives after the book changed',
  file: 'src/lib/domains/viewing/ui/reader-view.svelte.ts',
  code: `async pictureAt(index: ImageIndex): Promise<PagePicture | null> {
  const source = this.#source;
  if (source === null) return null;
  const generation = this.#generation;

  let got: Awaited<ReturnType<PageSource['picture']>>;
  try {
    got = await source.picture(index);
  } catch {
    return null;
  }

  if (generation !== this.#generation) {
    if (got.kind === 'success') releasePicture(got.picture);
    return null;
  }`,
};

const READER_OPEN: SourceSnippet = {
  label: 'The generation check after opening a book',
  file: 'src/lib/domains/viewing/ui/reader-view.svelte.ts',
  code: `async open(id: BookId, at: ImageIndex | null = null): Promise<void> {
  this.#places.flush();
  const generation = ++this.#generation;
  this.#release();
  this.opening = OPENING;
  this.grouping.reset();
  this.selection.clear();
  this.navigation.position = AT_THE_FIRST_IMAGE;
  this.#places.restart();

  let opened: OpenOutcome;
  try {
    opened = await this.#container.library.openForReading(id);
  } catch (cause) {
    if (generation !== this.#generation) return;
    this.opening = {
      kind: 'failed',
      message: \`That book could not be opened: \${describeCause(cause)}\`,
    };
    return;
  }

  if (generation !== this.#generation) {
    if (opened.kind === 'images') opened.pages.close();
    return;
  }`,
};

const WINDOW_LISTENERS: SourceSnippet = {
  label: 'The window listeners in the root layout',
  file: 'src/routes/+layout.svelte',
  code: `<svelte:window
  onerror={(event) => failures.windowError(event)}
  onunhandledrejection={(event) => failures.raise('promise', event.reason)}
/>`,
};

const WINDOW_ERROR: SourceSnippet = {
  label: 'Skipping the ResizeObserver notice',
  file: 'src/lib/shared/unexpected-failure.ts',
  code: `function isResizeObserverNotice(event: Event): boolean {
  if (!('message' in event) || event.message !== RESIZE_OBSERVER_NOTICE) return false;

  const cause = windowErrorCause(event);
  return cause === null || cause === undefined;
}

class UnexpectedFailures {
  #toaster: FailureToaster;
  #shown: ToastId | null = null;

  constructor(toaster: FailureToaster) {
    this.#toaster = toaster;
  }

  windowError(event: Event): void {
    if (isResizeObserverNotice(event)) return;

    this.raise('window', windowErrorCause(event));
  }`,
};

const BLOCKED_PATIENCE: SourceSnippet = {
  label: 'Opening a database, with patience for a blocked open',
  file: 'src/lib/platform/idb/connection.ts',
  code: `request.onsuccess = () => {
  stopWaiting();
  const db = request.result;
  if (abandoned) {
    db.close();
    return;
  }
  watchConnection(db, registration, retire);
  resolve(db);
};
request.onblocked = () => {
  stopWaiting();
  patience = setTimeout(() => {
    abandoned = true;
    reject(heldByAnotherTab(name));
  }, BLOCKED_PATIENCE_MS);
};
request.onerror = () => {
  stopWaiting();
  reject(openFailure(name, request.error));
};`,
};

const FIRST_RUN: SourceSnippet = {
  label: 'Racing the first GPU run against a deadline',
  file: 'src/workers/device-fallback.ts',
  code: `async function firstRunOf<Text>(
  running: Promise<Text>,
  expiring: Promise<void>,
): Promise<FirstRun<Text>> {
  const settled = running.then(
    (text): FirstRun<Text> => ({ ran: true, text }),
    (): FirstRun<Text> => ({ ran: false }),
  );

  const expired = expiring.then((): FirstRun<Text> => ({ ran: false }));
  return await Promise.race([settled, expired]);
}`,
};

const ZIP_STOP: SourceSnippet = {
  label: 'Stopping a ZIP entry read once the header is in',
  file: 'src/lib/domains/library/adapters/entry-image-size.ts',
  code: `async function streamedHeader(entry: FileEntry): Promise<HeaderReading> {
  const stop = new AbortController();
  const read: HeaderRead = { reading: { kind: 'short' }, bytes: new Uint8Array(0) };
  const sink = new WritableStream<Uint8Array>({
    write(chunk) {
      read.bytes = joined(read.bytes, chunk);
      read.reading = readImageHeader(read.bytes);
      if (read.reading.kind !== 'short' || read.bytes.byteLength >= MOST_HEADER_BYTES) {
        stop.abort();
      }
    },
  });

  await entry.getData(sink, { signal: stop.signal, useWebWorkers: false }).catch(() => undefined);
  return read.reading;
}`,
};

const ANIMATIONS: SourceSnippet = {
  label: 'Waiting for the animations that end',
  file: 'src/lib/ui/components/animations.ts',
  code: `function ends(animation: Settling): boolean {
  return animation.effect?.getComputedTiming().iterations !== Infinity;
}

async function animationsSettled(elements: readonly Animated[]): Promise<void> {
  const running = elements.flatMap((element) => element.getAnimations()).filter(ends);
  await Promise.allSettled(running.map((animation) => animation.finished));
}`,
};

const IMPORT_NOW: SourceSnippet = {
  label: 'importNow in CapturesImport',
  file: 'src/lib/domains/storage/ui/captures-import.svelte.ts',
  code: `async importNow(resolution: ConflictResolution): Promise<void> {
  const state = this.#state;
  if (state.kind !== 'preview') return;
  this.#state = IMPORTING;
  try {
    const result = await this.#importing.applyCapturesImport(state.plan, resolution);
    this.#state = applied(result);
  } catch (error) {
    this.#state = IDLE;
    throw error;
  } finally {
    await this.#refresh();
  }
}`,
};

const RECHECK: SourceSnippet = {
  label: 'The background update check',
  file: 'src/lib/shared/shell-updates.ts',
  code: `recheck(): void {
  if (!this.#online()) return;

  this.#registration?.update().catch((error: unknown) => {
    if (isNetworkFailure(error)) return;
    logUnexpected('service-worker', error);
  });
}`,
};

const ASYNC_SNIPPETS: readonly SourceSnippet[] = [
  EXPORT_ROUNDS,
  READER_PICTURE,
  READER_OPEN,
  WINDOW_LISTENERS,
  WINDOW_ERROR,
  BLOCKED_PATIENCE,
  FIRST_RUN,
  ZIP_STOP,
  ANIMATIONS,
  IMPORT_NOW,
  RECHECK,
];

export {
  ASYNC_SNIPPETS,
  ANIMATIONS,
  BLOCKED_PATIENCE,
  EXPORT_ROUNDS,
  FIRST_RUN,
  IMPORT_NOW,
  READER_OPEN,
  READER_PICTURE,
  RECHECK,
  WINDOW_ERROR,
  WINDOW_LISTENERS,
  ZIP_STOP,
};
export type { SourceSnippet };
