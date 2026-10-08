import type { BookId } from '$lib/shared/ids';
import { failureMessage } from '$lib/shared/query-failure';
import type { BookMatching } from '$lib/domains/library/domain/book/book-matching';
import type { ReadingDefaults } from '$lib/domains/library/domain/book/reading-defaults';
import { remoteItem } from '../domain/remote-item';
import type { BookOriginLink, DownloadState, RemoteItem } from '../domain/remote-item';
import type { DownloadProgress } from '../domain/opds-client';
import type { RemotePublication } from '../domain/remote-publication';
import type { DownloadPublicationResult } from '../use-cases/download-publication';
import { downloadFailureText } from './catalog-texts';
import type { DescribeOpenFile, DownloadFailure } from './catalog-texts';

type DownloadsUseCases = {
  readonly downloadPublication: (
    publication: RemotePublication,
    feedPosition: number,
    matching: BookMatching,
    defaults: ReadingDefaults,
    onProgress: DownloadProgress,
    signal?: AbortSignal,
  ) => Promise<DownloadPublicationResult>;
};

type DownloadsChoices = {
  readonly matching: () => BookMatching;
  readonly defaults: () => ReadingDefaults;
};

type DownloadsHooks = {
  readonly describeOpenFile: DescribeOpenFile;
  readonly downloaded: (publication: RemotePublication, bookId: BookId) => void;
};

type QueuedDownload = { readonly publication: RemotePublication; readonly feedPosition: number };

type QueueProgress = { readonly position: number; readonly total: number };

type RunOutcome = 'done' | 'stop';

const IDLE: DownloadState = { kind: 'idle' };

const NO_HELD: ReadonlyMap<string, BookOriginLink> = new Map();

function endsQueue(failure: DownloadFailure): boolean {
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

  async start(publication: RemotePublication, feedPosition: number): Promise<RunOutcome> {
    const entryId = publication.entryId;
    if (this.#controllers.has(entryId)) return 'done';
    const controller = new AbortController();
    this.#controllers.set(entryId, controller);
    this.#setState(entryId, { kind: 'running', progress: null });

    const result = await this.#cases
      .downloadPublication(
        publication,
        feedPosition,
        this.#choices.matching(),
        this.#choices.defaults(),
        (fraction) => this.#setState(entryId, { kind: 'running', progress: fraction }),
        controller.signal,
      )
      .catch((cause: unknown) => failureMessage(cause));
    this.#controllers.delete(entryId);

    if (typeof result === 'string') {
      this.#setState(entryId, { kind: 'failed', reason: result });
      return 'stop';
    }
    if (result.kind === 'success') {
      this.#held = new Map(this.#held).set(entryId, {
        bookId: result.bookId,
        updated: publication.updated,
      });
      this.#setState(entryId, IDLE);
      this.#hooks.downloaded(publication, result.bookId);
      return 'done';
    }
    if (result.kind === 'aborted') {
      this.#setState(entryId, IDLE);
      return this.#queueStopped ? 'stop' : 'done';
    }
    this.#setState(entryId, {
      kind: 'failed',
      reason: downloadFailureText(result, this.#hooks.describeOpenFile),
    });
    return endsQueue(result) ? 'stop' : 'done';
  }

  cancel(entryId: string): void {
    this.#controllers.get(entryId)?.abort();
  }

  async downloadAll(wanted: readonly QueuedDownload[]): Promise<void> {
    if (this.#queue !== null) return;
    const pending = wanted.filter(({ publication }) => this.itemFor(publication).kind === 'remote');
    if (pending.length === 0) return;
    this.#queueStopped = false;
    for (const [index, download] of pending.entries()) {
      if (this.#queueStopped) break;
      this.#queue = { position: index + 1, total: pending.length };
      if (this.itemFor(download.publication).kind !== 'remote') continue;
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

  #setState(entryId: string, state: DownloadState): void {
    const next = new Map(this.#states);
    if (state.kind === 'idle') next.delete(entryId);
    else next.set(entryId, state);
    this.#states = next;
  }
}

export { CatalogDownloads };
export type { DownloadsChoices, DownloadsHooks, DownloadsUseCases, QueuedDownload, QueueProgress };
