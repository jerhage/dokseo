import type { CaptureRepository } from '../domains/recognition/domain/capture/capture-repository';
import { buildCaptures } from './recognition-captures';
import type { CaptureUseCases } from './recognition-captures';
import { buildRecognitionEngine } from './recognition-engine';
import type { RecognitionEngineUseCases } from './recognition-engine';
import { buildTags } from './recognition-tags';
import type { TagUseCases } from './recognition-tags';

type RecognitionUseCases = RecognitionEngineUseCases & CaptureUseCases & TagUseCases;

function buildRecognition(captures: CaptureRepository): RecognitionUseCases {
  return {
    ...buildRecognitionEngine(),
    ...buildCaptures(captures),
    ...buildTags(captures),
  };
}

export { buildRecognition };
export type { RecognitionUseCases };
