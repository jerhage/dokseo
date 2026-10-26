import type { DownloadProgress } from '$lib/domains/catalog/domain/catalog-source';
import type { CatalogId } from '$lib/shared/ids';
import type { DownloadRemoteBookResult } from '../use-cases/download-remote-book';
import { downloadOutcome } from './remote-downloads';
import type { DownloadOutcome, RemoteDownload } from './remote-downloads';

type PasswordAsk =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'asking';
      readonly contentHash: string;
      readonly catalogId: CatalogId;
      readonly refused: boolean;
    };

const IDLE: RemoteDownload = { kind: 'idle' };

const NO_ASK: PasswordAsk = { kind: 'none' };

function createRemoteDownloads() {
  let states = $state.raw<ReadonlyMap<string, RemoteDownload>>(new Map());
  let ask = $state.raw<PasswordAsk>(NO_ASK);

  function setState(contentHash: string, next: RemoteDownload): void {
    const copy = new Map(states);
    if (next.kind === 'idle') copy.delete(contentHash);
    else copy.set(contentHash, next);
    states = copy;
  }

  function stateOf(contentHash: string): RemoteDownload {
    return states.get(contentHash) ?? IDLE;
  }

  async function start(
    contentHash: string,
    download: (onProgress: DownloadProgress) => Promise<DownloadRemoteBookResult>,
  ): Promise<DownloadOutcome | null> {
    if (stateOf(contentHash).kind === 'running') return null;
    setState(contentHash, { kind: 'running', progress: null });
    try {
      const result = await download((progress) =>
        setState(contentHash, { kind: 'running', progress }),
      );
      const outcome = downloadOutcome(result);
      if (outcome.kind === 'failed') setState(contentHash, outcome);
      else setState(contentHash, IDLE);
      if (outcome.kind === 'ask-password') {
        ask = {
          kind: 'asking',
          contentHash,
          catalogId: outcome.catalogId,
          refused: outcome.refused,
        };
      }
      return outcome;
    } catch (cause) {
      setState(contentHash, IDLE);
      throw cause;
    }
  }

  function dismissAsk(): void {
    ask = NO_ASK;
  }

  return {
    get ask() {
      return ask;
    },
    stateOf,
    start,
    dismissAsk,
  };
}

export { createRemoteDownloads };
export type { PasswordAsk };
