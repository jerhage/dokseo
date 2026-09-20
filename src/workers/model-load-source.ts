import type { ModelLoadSource } from '$lib/domains/recognition/domain/model-load';

type Fetching = (input: string | URL, init?: unknown) => Promise<unknown>;

export function watchModelLoadSource(env: { fetch: Fetching }): () => ModelLoadSource {
  const direct = env.fetch;
  let source: ModelLoadSource = 'cache';

  env.fetch = (input, init) => {
    source = 'network';
    return direct(input, init);
  };

  return () => source;
}
