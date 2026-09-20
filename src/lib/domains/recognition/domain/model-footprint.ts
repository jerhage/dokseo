import { match } from 'ts-pattern';
import type { Language } from '$lib/shared/language';

export type ModelFootprint = {
  readonly weightsBytes: number;
  readonly runtimeDownloadBytes: number;
  readonly runtimeOnDiskBytes: number;
};

const BYTES_PER_MB = 1_000_000;

export function modelFootprint(language: Language): ModelFootprint | null {
  return match(language)
    .with('ja', (): ModelFootprint => ({
      weightsBytes: 204_413_485,
      runtimeDownloadBytes: 6_596_832,
      runtimeOnDiskBytes: 26_861_777,
    }))
    .with('ko', () => null)
    .exhaustive();
}

export function megabytes(bytes: number, decimals = 0): number {
  const scale = 10 ** decimals;
  return Math.round((bytes / BYTES_PER_MB) * scale) / scale;
}

export function downloadMb(footprint: ModelFootprint): number {
  return megabytes(footprint.weightsBytes + footprint.runtimeDownloadBytes);
}

export function onDiskMb(footprint: ModelFootprint): number {
  return megabytes(footprint.weightsBytes + footprint.runtimeOnDiskBytes);
}
