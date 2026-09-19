import type { Result } from '$lib/shared/result';
import type { RecognizedText } from './recognized-text';

export type RecognitionError =
  | { readonly kind: 'no-text' }
  | { readonly kind: 'model-unavailable'; readonly cause: string }
  | { readonly kind: 'recognition-failed'; readonly cause: string };

export interface TextRecognizer {
  readonly id: string;
  recognize(image: ImageBitmap): Promise<Result<RecognizedText, RecognitionError>>;
}
