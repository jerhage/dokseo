import {
  downloadsModelPayload,
  type ModelLoadSource,
} from '$lib/domains/recognition/domain/model-load';

export type Fetching = (input: string | URL, init?: unknown) => Promise<unknown>;

export function asksForOneRange(init: unknown): boolean {
  if (typeof init !== 'object' || init === null) return false;

  const headers = (init as { headers?: unknown }).headers;
  return headers instanceof Headers && headers.has('Range');
}

export function watchModelLoadSource(env: { fetch: Fetching }): () => ModelLoadSource {
  const direct = env.fetch;
  let source: ModelLoadSource = 'cache';

  env.fetch = (input, init) => {
    if (downloadsModelPayload({ url: String(input), partial: asksForOneRange(init) })) {
      source = 'network';
    }

    return direct(input, init);
  };

  return () => source;
}
