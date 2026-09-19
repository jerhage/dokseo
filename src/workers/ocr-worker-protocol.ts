export type OcrRequest = {
  readonly kind: 'recognize';
  readonly id: number;
  readonly image: ImageBitmap;
};

export type OcrFailure = 'model-unavailable' | 'recognition-failed';

export type OcrReply =
  | { readonly kind: 'recognized'; readonly id: number; readonly text: string }
  | { readonly kind: 'progress'; readonly id: number; readonly fraction: number }
  | {
      readonly kind: 'failed';
      readonly id: number;
      readonly failure: OcrFailure;
      readonly cause: string;
    };
