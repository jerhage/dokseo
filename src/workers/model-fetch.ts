import type { ModelLoad, ModelLoadSource } from '$lib/domains/recognition/domain/model/model-load';
import { resumesModelWeights } from '$lib/domains/recognition/domain/model/model-partial';
import {
  advancedPayload,
  NO_PAYLOAD,
  payloadProgress,
  trackedPayload,
} from '$lib/domains/recognition/domain/model/payload-progress';
import type { PayloadFile } from '$lib/domains/recognition/domain/model/payload-progress';
import * as parts from '$lib/platform/opfs/partial-store';
import { asksForOneRange, watchModelLoadSource } from './model-load-source';
import type { Fetching } from './model-load-source';
import { fetchResumable } from './resumable-fetch';
import type { PartialFiles, RangedFetch } from './resumable-fetch';

type ModelFetchOptions = {
  readonly modelId: string;
  readonly store?: PartialFiles | undefined;
  readonly fetch?: RangedFetch | undefined;
  readonly chunkBytes?: number | undefined;
  readonly onProgress?: ((load: ModelLoad) => void) | undefined;
};

const opfsParts: PartialFiles = {
  sizeOf: (key: string) => parts.sizeOf(key),
  fileOf: (key: string) => parts.fileOf(key),
  openAppend: (key: string, from: number) => parts.openAppend(key, from),
  remove: (key: string) => parts.remove(key),
};

function overTheWire(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}

function installModelFetch(
  env: { fetch: Fetching },
  options: ModelFetchOptions,
): () => ModelLoadSource {
  const classified = watchModelLoadSource(env);
  const passThrough = env.fetch;
  const store = options.store ?? opfsParts;
  const report = options.onProgress;
  let transferred = false;
  let weights: readonly PayloadFile[] = NO_PAYLOAD;

  const sourceNow = (): ModelLoadSource => (transferred ? 'network' : classified());

  function tell(): void {
    report?.(payloadProgress(weights, sourceNow()));
  }

  env.fetch = (input, init) => {
    const url = String(input);
    if (!resumesModelWeights({ url, partial: asksForOneRange(init) }, options.modelId)) {
      return passThrough(input, init);
    }

    return fetchResumable(url, {
      fetch: options.fetch ?? overTheWire,
      store,
      chunkBytes: options.chunkBytes,
      onTransfer: () => {
        transferred = true;
      },
      onSpan: (totalBytes, heldBytes) => {
        weights = trackedPayload(weights, url, totalBytes, heldBytes);
        tell();
      },
      onBytes: (bytes) => {
        weights = advancedPayload(weights, url, bytes);
        tell();
      },
    });
  };

  return sourceNow;
}

export { installModelFetch };
export type { ModelFetchOptions };
