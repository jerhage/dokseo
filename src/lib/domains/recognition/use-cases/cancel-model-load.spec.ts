import { describe, expect, it } from 'vitest';
import { err, ok } from '$lib/shared/result';
import type { PartialReport } from '../domain/model-partial';
import type { PartialDownloads } from '../domain/partial-downloads';
import type { TextRecognizer } from '../domain/text-recognizer';
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
    measure: () => Promise.resolve(ok(DISCARDED)),
    discard: (modelId: string) => {
      steps.push(`discard ${modelId}`);
      return Promise.resolve(
        options.failing === true ? err({ kind: 'partials-unavailable' as const }) : ok(DISCARDED),
      );
    },
  };

  return { deps: { recognizer, partials }, steps };
}

describe('cancelModelLoad', () => {
  it('discards the part-downloaded file, because a cancel is not a pause', async () => {
    const { deps } = world();
    const discarded = await cancelModelLoad(deps, MODEL);

    if (!discarded.ok) throw new Error('The part-download was not discarded');
    expect(discarded.value).toEqual(DISCARDED);
  });

  it('stops the worker before it deletes what the worker was writing', async () => {
    const { deps, steps } = world();
    await cancelModelLoad(deps, MODEL);

    expect(steps).toEqual(['cancel', `discard ${MODEL}`]);
  });

  it('reports a store that could not be swept rather than claiming a clean cancel', async () => {
    const { deps } = world({ failing: true });
    const discarded = await cancelModelLoad(deps, MODEL);

    expect(discarded.ok).toBe(false);
  });
});
