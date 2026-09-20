import { describe, expect, it } from 'vitest';
import { ctcReading, joinedReading } from './ctc-reading';
import type { CtcLogits } from './ctc-reading';

const LABELS = ['', '가', '나', '다', ' '];

function stepsOf(chosen: readonly number[], certainty = 1): CtcLogits {
  const classes = LABELS.length;
  const data = new Float32Array(chosen.length * classes);
  for (const [step, index] of chosen.entries()) {
    data[step * classes + index] = certainty;
  }

  return { dims: [1, chosen.length, classes], data };
}

describe('ctcReading', () => {
  it('collapses a run of one index into a single character', () => {
    expect(ctcReading(stepsOf([1, 1, 1, 2, 2]), LABELS).text).toBe('가나');
  });

  it('keeps a repeated character that a blank separates', () => {
    expect(ctcReading(stepsOf([1, 0, 1]), LABELS).text).toBe('가가');
  });

  it('drops the blank rather than decoding it as a character', () => {
    expect(ctcReading(stepsOf([0, 0, 3, 0, 0]), LABELS).text).toBe('다');
  });

  it('decodes the space, which the dictionary does not carry', () => {
    expect(ctcReading(stepsOf([1, 4, 2]), LABELS).text).toBe('가 나');
  });

  it('reads nothing from steps that chose the blank throughout', () => {
    expect(ctcReading(stepsOf([0, 0, 0]), LABELS)).toEqual({ text: '', confidence: null });
  });

  it('reports the mean of the probabilities it chose as the confidence', () => {
    const classes = LABELS.length;
    const data = new Float32Array(2 * classes);
    data[1] = 0.8;
    data[classes + 2] = 0.6;

    const read = ctcReading({ dims: [1, 2, classes], data }, LABELS);
    expect(read.confidence).toBeCloseTo(0.7, 6);
  });

  it('reads an index the dictionary does not reach as nothing rather than failing', () => {
    expect(ctcReading(stepsOf([1]), ['', '']).text).toBe('');
  });
});

describe('joinedReading', () => {
  it('joins what each line read with a line break', () => {
    const joined = joinedReading([
      { text: '가', confidence: 0.9 },
      { text: '나', confidence: 0.7 },
    ]);

    expect(joined.text).toBe('가\n나');
    expect(joined.confidence).toBeCloseTo(0.8, 10);
  });

  it('leaves out a line that read nothing rather than opening a gap', () => {
    const joined = joinedReading([
      { text: '가', confidence: 0.9 },
      { text: '', confidence: null },
      { text: '나', confidence: 0.9 },
    ]);

    expect(joined.text).toBe('가\n나');
  });

  it('reports nothing when no line read anything', () => {
    expect(joinedReading([{ text: '', confidence: null }])).toEqual({
      text: '',
      confidence: null,
    });
  });
});
