import type { ModelLoadSource } from '$lib/domains/recognition/domain/model-load';
import { resumesModelWeights } from '$lib/domains/recognition/domain/model-partial';
import * as parts from '$lib/platform/opfs/partial-store';
import { asksForOneRange, watchModelLoadSource, type Fetching } from './model-load-source';
import { fetchResumable, type PartialFiles, type RangedFetch } from './resumable-fetch';

export type ModelFetchOptions = {
  readonly modelId: string;
  readonly store?: PartialFiles | undefined;
  readonly fetch?: RangedFetch | undefined;
  readonly chunkBytes?: number | undefined;
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

export function installModelFetch(
  env: { fetch: Fetching },
  options: ModelFetchOptions,
): () => ModelLoadSource {
  const classified = watchModelLoadSource(env);
  const passThrough = env.fetch;
  const store = options.store ?? opfsParts;
  let transferred = false;

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
    });
  };

  return () => (transferred ? 'network' : classified());
}
