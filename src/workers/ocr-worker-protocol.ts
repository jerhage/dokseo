import type { ModelLoadSource } from '$lib/domains/recognition/domain/model/model-load';
import type { RecognizerDevice } from '$lib/domains/recognition/domain/engine/recognizer-session';
import type { RecognizerSetup } from '$lib/domains/recognition/domain/engine/recognizer-setup';

type OcrRequest =
  | { readonly kind: 'open'; readonly id: number; readonly setup: RecognizerSetup }
  | { readonly kind: 'recognize'; readonly id: number; readonly image: ImageBitmap };

type OcrFailure = 'model-unavailable' | 'recognition-failed';

type OcrReply =
  | {
      readonly kind: 'recognized';
      readonly id: number;
      readonly text: string;
      readonly confidence: number | null;
    }
  | {
      readonly kind: 'opened';
      readonly id: number;
      readonly modelId: string;
      readonly device: RecognizerDevice;
      readonly fellBackFrom: RecognizerDevice | null;
    }
  | {
      readonly kind: 'progress';
      readonly fraction: number;
      readonly loadedBytes: number;
      readonly totalBytes: number;
      readonly source: ModelLoadSource;
    }
  | {
      readonly kind: 'failed';
      readonly id: number;
      readonly failure: OcrFailure;
      readonly cause: string;
    };

export type { OcrRequest, OcrFailure, OcrReply };
