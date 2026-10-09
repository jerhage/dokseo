import { match } from 'ts-pattern';
import type { CropError } from '../../domain/engine/region-cropper';
import type { RecognitionError } from '../../domain/engine/text-recognizer';
import type { RecognizeRegionResult } from '../../use-cases/engine/recognize-region';
import { NOTHING_READ } from './nothing-read';
import type { Settled } from './panel-capture';

function describeCropFailure(error: CropError): string {
  return match(error)
    .with(
      { kind: 'nothing-selected' },
      () => 'That box covered no part of a page, so there was nothing to crop.',
    )
    .with(
      { kind: 'unreadable' },
      (unreadable) => `That page could not be cropped: ${unreadable.cause}`,
    )
    .exhaustive();
}

function describeRecognitionFailure(error: RecognitionError): string {
  return match(error)
    .with({ kind: 'no-text' }, () => NOTHING_READ)
    .with(
      { kind: 'model-unavailable' },
      (unavailable) => `The recognition model could not be loaded: ${unavailable.cause}`,
    )
    .with({ kind: 'recognition-failed' }, (failed) => `The recognizer failed: ${failed.cause}`)
    .exhaustive();
}

function settlementOf(read: RecognizeRegionResult): Settled {
  return match(read)
    .returnType<Settled>()
    .with({ kind: 'success' }, ({ text }) => ({ status: 'done', text, edited: false }))
    .with({ kind: 'no-text' }, () => ({ status: 'empty' }))
    .with({ kind: 'nothing-selected' }, { kind: 'unreadable' }, (failure) => ({
      status: 'failed',
      message: describeCropFailure(failure),
    }))
    .with({ kind: 'model-unavailable' }, { kind: 'recognition-failed' }, (failure) => ({
      status: 'failed',
      message: describeRecognitionFailure(failure),
    }))
    .exhaustive();
}

export { settlementOf };
