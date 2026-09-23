import { match } from 'ts-pattern';
import { megabytes } from '$lib/shared/bytes';
import type { Language } from '$lib/shared/language';
import type { ModelRuntime } from '../engine/model-runtime';
import {
  encoderDecoderWeights,
  QUANTIZED_ENCODER_ONLY,
  QUANTIZED_THROUGHOUT,
  SINGLE_GRAPH_WEIGHTS,
} from './model-weights';
import type { EncoderDecoderPrecision } from './model-weights';

type ModelFootprint = {
  readonly modelId: string;
  readonly engine: string;
  readonly runtime: ModelRuntime;
  readonly label: string;
  readonly languages: readonly Language[];
  readonly note: string;
  readonly quality: string;
  readonly precision: EncoderDecoderPrecision | null;
  readonly weightFiles: readonly string[];
  readonly weightsBytes: number;
  readonly runtimeDownloadBytes: number;
  readonly runtimeOnDiskBytes: number;
};

const RUNTIME_DOWNLOAD_BYTES = 6_596_832;

const RUNTIME_ON_DISK_BYTES = 26_861_777;

const JAPANESE_OCR_MODEL: ModelFootprint = {
  modelId: 'kimchireader/manga-ocr-onnx-q8',
  engine: 'manga-ocr',
  runtime: 'manga-ocr',
  label: 'manga-ocr base, quantized throughout',
  languages: ['ja'],
  note: 'Both halves quantized, 87 MB smaller, and nobody has compared what it reads yet.',
  quality:
    'Unverified. The quantized encoder matched full precision token for token; the decoder has never been checked against it.',
  precision: QUANTIZED_THROUGHOUT,
  weightFiles: encoderDecoderWeights(QUANTIZED_THROUGHOUT),
  weightsBytes: 116_650_552,
  runtimeDownloadBytes: RUNTIME_DOWNLOAD_BYTES,
  runtimeOnDiskBytes: RUNTIME_ON_DISK_BYTES,
};

const JAPANESE_FULL_DECODER_MODEL: ModelFootprint = {
  modelId: 'DigitalLarynx/manga-ocr-onnx',
  engine: 'manga-ocr',
  runtime: 'manga-ocr',
  label: 'manga-ocr base, full-precision decoder',
  languages: ['ja'],
  note: 'The larger download whose reading was verified. Pick it to check the quantized one against.',
  quality: 'Verified on printed Japanese. Hand-lettering and sound effects are unmeasured.',
  precision: QUANTIZED_ENCODER_ONLY,
  weightFiles: encoderDecoderWeights(QUANTIZED_ENCODER_ONLY),
  weightsBytes: 204_413_485,
  runtimeDownloadBytes: RUNTIME_DOWNLOAD_BYTES,
  runtimeOnDiskBytes: RUNTIME_ON_DISK_BYTES,
};

const KOREAN_OCR_MODEL: ModelFootprint = {
  modelId: 'PaddlePaddle/korean_PP-OCRv5_mobile_rec_onnx',
  engine: 'PP-OCRv5',
  runtime: 'paddle-ocr',
  label: 'PP-OCRv5 mobile',
  languages: ['ko'],
  note: 'Exploratory. Nobody has read a real page with it yet.',
  quality: 'Reads one line at a time, so a bubble is split by eye before it is read.',
  precision: null,
  weightFiles: SINGLE_GRAPH_WEIGHTS,
  weightsBytes: 13_418_787,
  runtimeDownloadBytes: RUNTIME_DOWNLOAD_BYTES,
  runtimeOnDiskBytes: RUNTIME_ON_DISK_BYTES,
};

const ENGLISH_OCR_MODEL: ModelFootprint = {
  modelId: 'PaddlePaddle/en_PP-OCRv5_mobile_rec_onnx',
  engine: 'PP-OCRv5',
  runtime: 'paddle-ocr',
  label: 'PP-OCRv5 mobile',
  languages: ['en'],
  note: 'Exploratory. Nobody has read a real page with it yet.',
  quality: 'Reads one line at a time, so a bubble is split by eye before it is read.',
  precision: null,
  weightFiles: SINGLE_GRAPH_WEIGHTS,
  weightsBytes: 7_848_423,
  runtimeDownloadBytes: RUNTIME_DOWNLOAD_BYTES,
  runtimeOnDiskBytes: RUNTIME_ON_DISK_BYTES,
};

const KNOWN_MODELS: readonly ModelFootprint[] = [
  JAPANESE_OCR_MODEL,
  JAPANESE_FULL_DECODER_MODEL,
  KOREAN_OCR_MODEL,
  ENGLISH_OCR_MODEL,
];

function everyModel(): readonly ModelFootprint[] {
  return KNOWN_MODELS;
}

function knownModel(modelId: string): ModelFootprint | null {
  return KNOWN_MODELS.find((known) => known.modelId === modelId) ?? null;
}

function reads(footprint: ModelFootprint, language: Language): boolean {
  return footprint.languages.includes(language);
}

function modelFootprint(language: Language): ModelFootprint | null {
  return match(language)
    .with('ja', () => JAPANESE_OCR_MODEL)
    .with('ko', () => KOREAN_OCR_MODEL)
    .with('en', () => ENGLISH_OCR_MODEL)
    .exhaustive();
}

function modelsFor(language: Language): readonly ModelFootprint[] {
  return KNOWN_MODELS.filter((known) => reads(known, language));
}

function chosenModel(language: Language, modelId: string | null): ModelFootprint | null {
  const offered = modelsFor(language);
  return offered.find((known) => known.modelId === modelId) ?? offered[0] ?? null;
}

function weightsMb(footprint: ModelFootprint): number {
  return megabytes(footprint.weightsBytes);
}

function runtimeMb(footprint: ModelFootprint): number {
  return megabytes(footprint.runtimeDownloadBytes);
}

function downloadMb(footprint: ModelFootprint): number {
  return megabytes(footprint.weightsBytes + footprint.runtimeDownloadBytes);
}

function onDiskMb(footprint: ModelFootprint): number {
  return megabytes(footprint.weightsBytes + footprint.runtimeOnDiskBytes);
}

export {
  JAPANESE_OCR_MODEL,
  JAPANESE_FULL_DECODER_MODEL,
  KOREAN_OCR_MODEL,
  ENGLISH_OCR_MODEL,
  everyModel,
  knownModel,
  reads,
  modelFootprint,
  modelsFor,
  chosenModel,
  weightsMb,
  runtimeMb,
  downloadMb,
  onDiskMb,
};
export type { ModelFootprint };
