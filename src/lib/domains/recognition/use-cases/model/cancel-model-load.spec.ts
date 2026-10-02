import { describe, expect, it } from 'vitest';
import type { PartialReport } from '../../domain/model/model-partial';
import type { PartialDownloads } from '../../domain/model/partial-downloads';
import type { TextRecognizer } from '../../domain/engine/text-recognizer';
import { cancelModelLoad } from './cancel-model-load';

const MODEL = 'DigitalLarynx/manga-ocr-onnx';

const DISCARDED: PartialReport = { modelId: MODEL, files: 1, bytes: 62_000_000 };

function world(options: { readonly failing?: boolean } = {}) {
  const steps: string[] = [];

  const recognizer: TextRecognizer = {
    id: 'manga-ocr',
    prepare: () => Promise.reject(new Error('not used')),
    cancel: () => {
      steps.push('cancel');
    },
    recognize: () => Promise.reject(new Error('not used')),
  };

  const partials: PartialDownloads = {
    measure: () => Promise.resolve({ kind: 'success', report: DISCARDED }),
    discard: (modelId: string) => {
      steps.push(`discard ${modelId}`);
      return Promise.resolve(
        options.failing === true
          ? { kind: 'partials-unavailable' as const }
          : { kind: 'success' as const, report: DISCARDED },
      );
    },
  };

  return { deps: { recognizer, partials }, steps };
}

describe('cancelModelLoad', () => {
  it.each([
    [
      'the discarded file, because a cancel is not a pause',
      false,
      { kind: 'success', report: DISCARDED },
    ],
    [
      'a store that could not be swept rather than a clean cancel',
      true,
      { kind: 'partials-unavailable' },
    ],
  ] as const)('reports %s', async (_outcome, failing, result) => {
    const { deps } = world({ failing });
    const discarded = await cancelModelLoad(deps, MODEL);

    expect(discarded).toEqual(result);
  });

  it('stops the worker before it deletes what the worker was writing', async () => {
    const { deps, steps } = world();
    await cancelModelLoad(deps, MODEL);

    expect(steps).toEqual(['cancel', `discard ${MODEL}`]);
  });
});
