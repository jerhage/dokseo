import type { BookId } from '$lib/shared/ids';
import { failureMessage } from '$lib/shared/query-failure';
import type { BookMatching } from '$lib/domains/library/domain/book/book-matching';
import type { ReadingDefaults } from '$lib/domains/library/domain/book/reading-defaults';
import { isLater, remoteItem } from '../domain/remote-item';
import type { BookOriginLink, DownloadState, RemoteItem } from '../domain/remote-item';
import type { DownloadProgress } from '../domain/catalog-source';
import type { RemotePublication } from '../domain/remote-publication';
import type { DownloadPublicationResult } from '../use-cases/download-publication';
import type { UpdatePublicationResult } from '../use-cases/update-publication';
import { downloadFailureText, updateFailureText } from './catalog-texts';
import type { DescribeOpenFile, DownloadFailure, UpdateFailure } from './catalog-texts';

type DownloadsUseCases = {
  readonly downloadPublication: (
    publication: RemotePublication,
    feedPosition: number,
    matching: BookMatching,
    defaults: ReadingDefaults,
    onProgress: DownloadProgress,
    signal?: AbortSignal,
  ) => Promise<DownloadPublicationResult>;
  readonly updatePublication: (
    publication: RemotePublication,
    bookId: BookId,
    feedPosition: number,
    onProgress: DownloadProgress,
    signal?: AbortSignal,
  ) => Promise<UpdatePublicationResult>;
};

type DownloadsChoices = {
  readonly matching: () => BookMatching;
  readonly defaults: () => ReadingDefaults;
};

type DownloadsHooks = {
  readonly describeOpenFile: DescribeOpenFile;
  readonly downloaded: (publication: RemotePublication, bookId: BookId) => void;
  readonly updated: (publication: RemotePublication, bookId: BookId) => void;
};

type ReplaceRequest = {
  readonly publication: RemotePublication;
  readonly bookId: BookId;
  readonly feedPosition: number;
};

type QueueEffect = 'ends-queue' | 'keeps-queue';

type Settled =
  | { readonly kind: 'success'; readonly bookId: BookId }
  | { readonly kind: 'aborted' }
  | { readonly kind: 'failed'; readonly reason: string; readonly queueEffect: QueueEffect };

type Attempt = (report: DownloadProgress, signal: AbortSignal) => Promise<Settled | string>;

type Finish = (publication: RemotePublication, bookId: BookId) => void;

type QueuedDownload = { readonly publication: RemotePublication; readonly feedPosition: number };

type QueueState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'running'; readonly position: number; readonly total: number }
  | { readonly kind: 'stopping'; readonly position: number; readonly total: number };

type ReplacementState =
  | { readonly kind: 'none' }
  | { readonly kind: 'asked'; readonly request: ReplaceRequest };

type RunOutcome = 'done' | 'stop';

const IDLE: DownloadState = { kind: 'idle' };

const QUEUE_IDLE: QueueState = { kind: 'idle' };

const NO_REPLACEMENT: ReplacementState = { kind: 'none' };

const NO_HELD: ReadonlyMap<string, BookOriginLink> = new Map();

function queueEffectOf(failure: DownloadFailure | UpdateFailure): QueueEffect {
  return failure.kind === 'offline' ||
    failure.kind === 'unauthorized' ||
    failure.kind === 'locked' ||
    failure.kind === 'storage-unavailable'
    ? 'ends-queue'
    : 'keeps-queue';
}

class CatalogDownloads {
  #states = $state.raw<ReadonlyMap<string, DownloadState>>(new Map());
  #downloaded = $state.raw<ReadonlyMap<string, BookOriginLink>>(NO_HELD);
  #queue = $state.raw<QueueState>(QUEUE_IDLE);
  #replacement = $state.raw<ReplacementState>(NO_REPLACEMENT);
  #controllers = new Map<string, AbortController>();
  #cases: DownloadsUseCases;
  #choices: DownloadsChoices;
  #hooks: DownloadsHooks;
  #held: () => ReadonlyMap<string, BookOriginLink>;

  constructor(
    cases: DownloadsUseCases,
    choices: DownloadsChoices,
    hooks: DownloadsHooks,
    held: () => ReadonlyMap<string, BookOriginLink> = () => NO_HELD,
  ) {
    this.#cases = cases;
    this.#choices = choices;
    this.#hooks = hooks;
    this.#held = held;
  }

  get queue(): QueueState {
    return this.#queue;
  }

  itemFor(publication: RemotePublication): RemoteItem {
    return remoteItem(
      publication,
      this.#linkOf(publication.entryId),
      this.#states.get(publication.entryId) ?? IDLE,
    );
  }

  get replacement(): ReplacementState {
    return this.#replacement;
  }

  askToReplace(publication: RemotePublication, feedPosition: number): void {
    const bookId = this.#staleBook(publication);
    if (bookId === null) return;
    this.#replacement = { kind: 'asked', request: { publication, bookId, feedPosition } };
  }

  dismissReplacement(): void {
    this.#replacement = NO_REPLACEMENT;
  }

  async confirmReplacement(): Promise<RunOutcome> {
    const asked = this.#replacement;
    this.#replacement = NO_REPLACEMENT;
    if (asked.kind === 'none') return 'done';
    const { request } = asked;
    return this.#run(request.publication, this.#updating(request), this.#hooks.updated);
  }

  async start(publication: RemotePublication, feedPosition: number): Promise<RunOutcome> {
    const bookId = this.#staleBook(publication);
    if (bookId === null) {
      return this.#run(
        publication,
        this.#downloading(publication, feedPosition),
        this.#hooks.downloaded,
      );
    }
    const request = { publication, bookId, feedPosition };
    return this.#run(publication, this.#updating(request), this.#hooks.updated);
  }

  cancel(entryId: string): void {
    this.#controllers.get(entryId)?.abort();
  }

  async downloadAll(
    wanted: readonly QueuedDownload[],
    started?: (publication: RemotePublication) => void,
  ): Promise<void> {
    if (this.#queue.kind !== 'idle') return;
    const pending = wanted.filter(({ publication }) => this.#queueable(publication));
    if (pending.length === 0) return;
    for (const [index, download] of pending.entries()) {
      if (this.#isStopping()) break;
      this.#queue = { kind: 'running', position: index + 1, total: pending.length };
      if (!this.#queueable(download.publication)) continue;
      started?.(download.publication);
      const outcome = await this.start(download.publication, download.feedPosition);
      if (outcome === 'stop') break;
    }
    this.#queue = QUEUE_IDLE;
  }

  cancelAll(): void {
    const queue = this.#queue;
    if (queue.kind === 'running') this.#queue = { ...queue, kind: 'stopping' };
    for (const controller of this.#controllers.values()) controller.abort();
  }

  dispose(): void {
    this.cancelAll();
  }

  async #run(
    publication: RemotePublication,
    attempt: Attempt,
    finished: Finish,
  ): Promise<RunOutcome> {
    const entryId = publication.entryId;
    if (this.#controllers.has(entryId)) return 'done';
    const controller = new AbortController();
    this.#controllers.set(entryId, controller);
    this.#setState(entryId, { kind: 'running', progress: null });

    const settled = await attempt(
      (fraction) => this.#setState(entryId, { kind: 'running', progress: fraction }),
      controller.signal,
    );
    this.#controllers.delete(entryId);

    if (typeof settled === 'string') {
      this.#setState(entryId, { kind: 'failed', reason: settled });
      return 'stop';
    }
    if (settled.kind === 'success') {
      this.#downloaded = new Map(this.#downloaded).set(entryId, {
        bookId: settled.bookId,
        updated: publication.updated,
      });
      this.#setState(entryId, IDLE);
      finished(publication, settled.bookId);
      return 'done';
    }
    if (settled.kind === 'aborted') {
      this.#setState(entryId, IDLE);
      return this.#isStopping() ? 'stop' : 'done';
    }
    this.#setState(entryId, { kind: 'failed', reason: settled.reason });
    return settled.queueEffect === 'ends-queue' ? 'stop' : 'done';
  }

  #downloading(publication: RemotePublication, feedPosition: number): Attempt {
    return async (report, signal) => {
      const result = await this.#cases
        .downloadPublication(
          publication,
          feedPosition,
          this.#choices.matching(),
          this.#choices.defaults(),
          report,
          signal,
        )
        .catch((cause: unknown) => failureMessage(cause));
      if (typeof result === 'string') return result;
      if (result.kind === 'success' || result.kind === 'aborted') return result;
      return {
        kind: 'failed',
        reason: downloadFailureText(result, this.#hooks.describeOpenFile),
        queueEffect: queueEffectOf(result),
      };
    };
  }

  #updating(request: ReplaceRequest): Attempt {
    return async (report, signal) => {
      const result = await this.#cases
        .updatePublication(
          request.publication,
          request.bookId,
          request.feedPosition,
          report,
          signal,
        )
        .catch((cause: unknown) => failureMessage(cause));
      if (typeof result === 'string') return result;
      if (result.kind === 'success' || result.kind === 'aborted') return result;
      return {
        kind: 'failed',
        reason: updateFailureText(result, this.#hooks.describeOpenFile),
        queueEffect: queueEffectOf(result),
      };
    };
  }

  #isStopping(): boolean {
    return this.#queue.kind === 'stopping';
  }

  #staleBook(publication: RemotePublication): BookId | null {
    const link = this.#linkOf(publication.entryId);
    if (link === null) return null;
    return isLater(publication.updated, link.updated) ? link.bookId : null;
  }

  #linkOf(entryId: string): BookOriginLink | null {
    return this.#downloaded.get(entryId) ?? this.#held().get(entryId) ?? null;
  }

  #queueable(publication: RemotePublication): boolean {
    const kind = this.itemFor(publication).kind;
    return kind === 'remote' || kind === 'download-failed';
  }

  #setState(entryId: string, state: DownloadState): void {
    const next = new Map(this.#states);
    if (state.kind === 'idle') next.delete(entryId);
    else next.set(entryId, state);
    this.#states = next;
  }
}

export { CatalogDownloads };
export type {
  DownloadsChoices,
  DownloadsHooks,
  DownloadsUseCases,
  QueuedDownload,
  QueueEffect,
  QueueState,
  ReplaceRequest,
  ReplacementState,
};
