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

type Settled =
  | { readonly kind: 'success'; readonly bookId: BookId }
  | { readonly kind: 'aborted' }
  | { readonly kind: 'failed'; readonly reason: string; readonly queueEnds: boolean };

type Attempt = (report: DownloadProgress, signal: AbortSignal) => Promise<Settled | string>;

type Finish = (publication: RemotePublication, bookId: BookId) => void;

type QueuedDownload = { readonly publication: RemotePublication; readonly feedPosition: number };

type QueueProgress = { readonly position: number; readonly total: number };

type RunOutcome = 'done' | 'stop';

const IDLE: DownloadState = { kind: 'idle' };

const NO_HELD: ReadonlyMap<string, BookOriginLink> = new Map();

function endsQueue(failure: DownloadFailure | UpdateFailure): boolean {
  return (
    failure.kind === 'offline' ||
    failure.kind === 'unauthorized' ||
    failure.kind === 'locked' ||
    failure.kind === 'storage-unavailable'
  );
}

class CatalogDownloads {
  #states = $state.raw<ReadonlyMap<string, DownloadState>>(new Map());
  #held = $state.raw<ReadonlyMap<string, BookOriginLink>>(NO_HELD);
  #queue = $state.raw<QueueProgress | null>(null);
  #replacement = $state.raw<ReplaceRequest | null>(null);
  #controllers = new Map<string, AbortController>();
  #cases: DownloadsUseCases;
  #choices: DownloadsChoices;
  #hooks: DownloadsHooks;
  #queueStopped = false;

  constructor(cases: DownloadsUseCases, choices: DownloadsChoices, hooks: DownloadsHooks) {
    this.#cases = cases;
    this.#choices = choices;
    this.#hooks = hooks;
  }

  get queue(): QueueProgress | null {
    return this.#queue;
  }

  setHeld(held: ReadonlyMap<string, BookOriginLink>): void {
    this.#held = held;
  }

  addHeld(held: ReadonlyMap<string, BookOriginLink>): void {
    this.#held = new Map([...this.#held, ...held]);
  }

  itemFor(publication: RemotePublication): RemoteItem {
    return remoteItem(
      publication,
      this.#held.get(publication.entryId) ?? null,
      this.#states.get(publication.entryId) ?? IDLE,
    );
  }

  get replacement(): ReplaceRequest | null {
    return this.#replacement;
  }

  askToReplace(publication: RemotePublication, feedPosition: number): void {
    const bookId = this.#staleBook(publication);
    if (bookId === null) return;
    this.#replacement = { publication, bookId, feedPosition };
  }

  dismissReplacement(): void {
    this.#replacement = null;
  }

  async confirmReplacement(): Promise<RunOutcome> {
    const request = this.#replacement;
    this.#replacement = null;
    if (request === null) return 'done';
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
    if (this.#queue !== null) return;
    const pending = wanted.filter(({ publication }) => this.#queueable(publication));
    if (pending.length === 0) return;
    this.#queueStopped = false;
    for (const [index, download] of pending.entries()) {
      if (this.#queueStopped) break;
      this.#queue = { position: index + 1, total: pending.length };
      if (!this.#queueable(download.publication)) continue;
      started?.(download.publication);
      const outcome = await this.start(download.publication, download.feedPosition);
      if (outcome === 'stop') break;
    }
    this.#queue = null;
  }

  cancelAll(): void {
    this.#queueStopped = true;
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
      this.#held = new Map(this.#held).set(entryId, {
        bookId: settled.bookId,
        updated: publication.updated,
      });
      this.#setState(entryId, IDLE);
      finished(publication, settled.bookId);
      return 'done';
    }
    if (settled.kind === 'aborted') {
      this.#setState(entryId, IDLE);
      return this.#queueStopped ? 'stop' : 'done';
    }
    this.#setState(entryId, { kind: 'failed', reason: settled.reason });
    return settled.queueEnds ? 'stop' : 'done';
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
        queueEnds: endsQueue(result),
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
        queueEnds: endsQueue(result),
      };
    };
  }

  #staleBook(publication: RemotePublication): BookId | null {
    const link = this.#held.get(publication.entryId);
    if (link === undefined) return null;
    return isLater(publication.updated, link.updated) ? link.bookId : null;
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
  QueueProgress,
  ReplaceRequest,
};
