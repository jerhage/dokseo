export type ModelLoadSource = 'cache' | 'network';

export type ModelLoad = {
  readonly fraction: number;
  readonly source: ModelLoadSource;
};
