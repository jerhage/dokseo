import type { Result } from '$lib/shared/result';
import type { ModelLoadError } from './model-load';
import type { RecognizedText } from './recognized-text';
import type { RecognizerSession } from './recognizer-session';

export type RecognitionError =
  | { readonly kind: 'no-text' }
  | { readonly kind: 'model-unavailable'; readonly cause: string }
  | { readonly kind: 'recognition-failed'; readonly cause: string };

export interface TextRecognizer {
  readonly id: string;
  prepare(): Promise<Result<RecognizerSession, ModelLoadError>>;
  cancel(): void;
  recognize(image: ImageBitmap): Promise<Result<RecognizedText, RecognitionError>>;
}
