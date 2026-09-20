import type { ModelLoadSource } from '$lib/domains/recognition/domain/model-load';
import type { RecognizerDevice } from '$lib/domains/recognition/domain/recognizer-session';

export type OcrRequest = {
  readonly kind: 'recognize';
  readonly id: number;
  readonly image: ImageBitmap;
};

export type OcrFailure = 'model-unavailable' | 'recognition-failed';

export type OcrReply =
  | { readonly kind: 'recognized'; readonly id: number; readonly text: string }
  | {
      readonly kind: 'opened';
      readonly modelId: string;
      readonly device: RecognizerDevice;
    }
  | {
      readonly kind: 'progress';
      readonly id: number;
      readonly fraction: number;
      readonly source: ModelLoadSource;
    }
  | {
      readonly kind: 'failed';
      readonly id: number;
      readonly failure: OcrFailure;
      readonly cause: string;
    };
