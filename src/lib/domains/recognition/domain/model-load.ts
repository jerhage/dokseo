export type ModelLoadSource = 'cache' | 'network';

export type ModelLoad = {
  readonly fraction: number;
  readonly source: ModelLoadSource;
  readonly loadedBytes: number;
  readonly totalBytes: number;
};

export function loadVerb(source: ModelLoadSource): string {
  return source === 'network' ? 'Downloading' : 'Loading';
}

export type ModelLoadError =
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'unavailable'; readonly cause: string };
