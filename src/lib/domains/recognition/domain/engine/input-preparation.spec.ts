import { describe, expect, it } from 'vitest';
import { inputPreparationFor } from './input-preparation';
import { MAX_MODEL_INPUT_EDGE } from './model-input';
import { MODEL_RUNTIMES } from './model-runtime';

describe('inputPreparationFor', () => {
  it('greys a manga-ocr input the way Pillow converts to L', () => {
    expect(inputPreparationFor('manga-ocr')).toEqual({
      kind: 'pillow-grey',
      maxEdge: MAX_MODEL_INPUT_EDGE,
    });
  });

  it('leaves a PaddleOCR input in colour', () => {
    expect(inputPreparationFor('paddle-ocr')).toEqual({
      kind: 'colour',
      maxEdge: MAX_MODEL_INPUT_EDGE,
    });
  });

  it('caps the long edge for every runtime', () => {
    for (const runtime of MODEL_RUNTIMES) {
      expect(inputPreparationFor(runtime).maxEdge).toBe(MAX_MODEL_INPUT_EDGE);
    }
  });
});
