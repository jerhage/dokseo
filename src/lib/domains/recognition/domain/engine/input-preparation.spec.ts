import { describe, expect, it } from 'vitest';
import { inputPreparationFor } from './input-preparation';
import { MAX_MODEL_INPUT_EDGE } from './model-input';

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
});
