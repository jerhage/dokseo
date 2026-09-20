export type ModelLoadSource = 'cache' | 'network';

export type ModelLoad = {
  readonly fraction: number;
  readonly source: ModelLoadSource;
  readonly loadedBytes: number;
  readonly totalBytes: number;
};

export type ModelFetch = {
  readonly url: string;
  readonly partial: boolean;
};

const PAYLOAD_SUFFIXES = ['.onnx', '.wasm'];

export function downloadsModelPayload(fetched: ModelFetch): boolean {
  if (fetched.partial) return false;

  const path = fetched.url.split(/[?#]/)[0] ?? '';
  return PAYLOAD_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

export function loadVerb(source: ModelLoadSource): string {
  return source === 'network' ? 'Downloading' : 'Loading';
}

export type ModelLoadError =
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'unavailable'; readonly cause: string };
