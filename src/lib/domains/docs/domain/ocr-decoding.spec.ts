import { describe, expect, it } from 'vitest';
import { probabilityOf, sequenceScore, textAfter, tokensAfter } from './ocr-decoding';
import type { DecodeRun, DecodeStep } from './ocr-decoding';
import { RECORDED_BUBBLE_RUN } from './ocr-recorded-run';

function stepChoosing(id: number, piece: string, logProb: number): DecodeStep {
  return {
    prefixLength: 1,
    candidates: [
      { id, piece, logProb },
      { id: 99, piece: 'x', logProb: -9 },
    ],
  };
}

const run: DecodeRun = {
  ...RECORDED_BUBBLE_RUN,
  steps: [
    stepChoosing(2, '[CLS]', 0),
    stepChoosing(10, 'a', -0.5),
    stepChoosing(11, 'b', -1.5),
    stepChoosing(3, '[SEP]', -0.2),
  ],
};

describe('tokensAfter', () => {
  it('starts from the start token and appends each chosen token in order', () => {
    expect(tokensAfter(run, 3)).toEqual([2, 2, 10, 11]);
  });

  it('holds only the start token before the first step', () => {
    expect(tokensAfter(run, 0)).toEqual([2]);
  });
});

describe('textAfter', () => {
  it('joins the chosen pieces and leaves out the start and end tokens', () => {
    expect(textAfter(run, 4)).toBe('ab');
  });
});

describe('sequenceScore', () => {
  it('sums the chosen log probabilities and turns their mean back into a probability', () => {
    const score = sequenceScore(run.steps);

    expect(score.logProb).toBeCloseTo(-2.2);
    expect(score.meanLogProb).toBeCloseTo(-0.55);
    expect(score.confidence).toBeCloseTo(Math.exp(-0.55));
  });

  it('names the least likely chosen token', () => {
    expect(sequenceScore(run.steps).weakest.piece).toBe('b');
  });

  it('rejects a run with no steps', () => {
    expect(() => sequenceScore([])).toThrow();
  });
});

describe('probabilityOf', () => {
  it('reads a log probability of zero as certainty', () => {
    expect(probabilityOf(0)).toBe(1);
  });
});

describe('the recorded bubble run', () => {
  it('spells the text the tokenizer decoded, without its spaces', () => {
    const recorded = RECORDED_BUBBLE_RUN;

    expect(textAfter(recorded, recorded.steps.length)).toBe(recorded.decoded.replace(/\s+/gu, ''));
  });

  it('ends on the end token', () => {
    const last = RECORDED_BUBBLE_RUN.steps.at(-1);

    expect(last?.candidates[0].id).toBe(RECORDED_BUBBLE_RUN.endToken);
  });

  it('grows the decoder input by one token per step', () => {
    const lengths = RECORDED_BUBBLE_RUN.steps.map((step) => step.prefixLength);

    expect(lengths).toEqual(lengths.map((_, index) => index + 1));
  });
});
