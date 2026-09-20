type ModelLoadSource = 'cache' | 'network';

type ModelLoad = {
  readonly fraction: number;
  readonly source: ModelLoadSource;
  readonly loadedBytes: number;
  readonly totalBytes: number;
};

type ModelFetch = {
  readonly url: string;
  readonly partial: boolean;
};

const PAYLOAD_SUFFIXES = ['.onnx', '.wasm'];

function downloadsModelPayload(fetched: ModelFetch): boolean {
  if (fetched.partial) return false;

  const path = fetched.url.split(/[?#]/)[0] ?? '';
  return PAYLOAD_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

function loadVerb(source: ModelLoadSource): string {
  return source === 'network' ? 'Downloading' : 'Loading';
}

type ModelLoadError =
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'unavailable'; readonly cause: string };

export { downloadsModelPayload, loadVerb };
export type { ModelLoadSource, ModelLoad, ModelFetch, ModelLoadError };
