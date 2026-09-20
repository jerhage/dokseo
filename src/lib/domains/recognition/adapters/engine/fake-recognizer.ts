import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { ModelLoadError } from '../../domain/model/model-load';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { RecognitionError, TextRecognizer } from '../../domain/engine/text-recognizer';

const LINES = [
  'どうしたんだ',
  'ちょっと待って',
  'そんなはずはない',
  'もう時間がないよ',
  'こっちに来て',
  '早く逃げろ',
  'ありがとう、助かった',
  '何も聞こえない',
] as const;

function lineFor(width: number, height: number): string {
  const seeded =
    Math.imul(Math.trunc(width), 2654435761) ^ Math.imul(Math.trunc(height), 2246822519);
  const spread = Math.imul(seeded ^ (seeded >>> 15), 2246822519);
  const mixed = spread ^ (spread >>> 13);
  return LINES[(mixed >>> 0) % LINES.length] ?? LINES[0];
}

function recognizeSize(image: ImageBitmap): Promise<Result<RecognizedText, RecognitionError>> {
  return Promise.resolve(ok(recognizedText(lineFor(image.width, image.height))));
}

function noSession(): Promise<Result<RecognizerSession, ModelLoadError>> {
  return Promise.resolve(
    err({ kind: 'unavailable', cause: 'The fake recognizer opens no session' }),
  );
}

export function createFakeRecognizer(): TextRecognizer {
  return {
    id: 'fake',
    prepare: noSession,
    cancel: () => undefined,
    recognize: recognizeSize,
  };
}
