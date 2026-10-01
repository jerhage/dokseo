import type { ModelLoadError } from '../model/model-load';
import type { RecognizedText } from './recognized-text';
import type { RecognizerSession } from './recognizer-session';

type RecognitionError =
  | { readonly kind: 'no-text' }
  | { readonly kind: 'model-unavailable'; readonly cause: string }
  | { readonly kind: 'recognition-failed'; readonly cause: string };

type RecognizerOpening =
  | { readonly kind: 'success'; readonly session: RecognizerSession }
  | ModelLoadError;

type Recognition = { readonly kind: 'success'; readonly text: RecognizedText } | RecognitionError;

interface TextRecognizer {
  readonly id: string;
  prepare(): Promise<RecognizerOpening>;
  cancel(): void;
  recognize(image: ImageBitmap): Promise<Recognition>;
}

export type { Recognition, RecognitionError, RecognizerOpening, TextRecognizer };
