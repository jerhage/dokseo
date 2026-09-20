import { match } from 'ts-pattern';
import type { Language } from '$lib/shared/language';

export type ModelFootprint = {
  readonly modelId: string;
  readonly engine: string;
  readonly label: string;
  readonly language: Language;
  readonly note: string;
  readonly weightsBytes: number;
  readonly runtimeDownloadBytes: number;
  readonly runtimeOnDiskBytes: number;
};

const BYTES_PER_MB = 1_000_000;

const BYTES_PER_KB = 1_000;

export const JAPANESE_OCR_MODEL: ModelFootprint = {
  modelId: 'DigitalLarynx/manga-ocr-onnx',
  engine: 'manga-ocr',
  label: 'manga-ocr base',
  language: 'ja',
  note: 'The only export verified to read correctly.',
  weightsBytes: 204_413_485,
  runtimeDownloadBytes: 6_596_832,
  runtimeOnDiskBytes: 26_861_777,
};

const KNOWN_MODELS: readonly ModelFootprint[] = [JAPANESE_OCR_MODEL];

export function engineName(modelId: string): string {
  return KNOWN_MODELS.find((known) => known.modelId === modelId)?.engine ?? modelId;
}

export function knownModel(modelId: string): ModelFootprint | null {
  return KNOWN_MODELS.find((known) => known.modelId === modelId) ?? null;
}

export function modelFootprint(language: Language): ModelFootprint | null {
  return match(language)
    .with('ja', () => JAPANESE_OCR_MODEL)
    .with('ko', () => null)
    .exhaustive();
}

export function modelsFor(language: Language): readonly ModelFootprint[] {
  return KNOWN_MODELS.filter((known) => known.language === language);
}

export function chosenModel(language: Language, modelId: string | null): ModelFootprint | null {
  const offered = modelsFor(language);
  return offered.find((known) => known.modelId === modelId) ?? offered[0] ?? null;
}

export function megabytes(bytes: number, decimals = 0): number {
  const scale = 10 ** decimals;
  return Math.round((bytes / BYTES_PER_MB) * scale) / scale;
}

export function storedSize(bytes: number): string {
  return bytes >= BYTES_PER_MB
    ? `${megabytes(bytes)} MB`
    : `${Math.round(bytes / BYTES_PER_KB)} kB`;
}

export function weightsMb(footprint: ModelFootprint): number {
  return megabytes(footprint.weightsBytes);
}

export function runtimeMb(footprint: ModelFootprint): number {
  return megabytes(footprint.runtimeDownloadBytes);
}

export function downloadMb(footprint: ModelFootprint): number {
  return megabytes(footprint.weightsBytes + footprint.runtimeDownloadBytes);
}

export function onDiskMb(footprint: ModelFootprint): number {
  return megabytes(footprint.weightsBytes + footprint.runtimeOnDiskBytes);
}
