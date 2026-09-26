import { describe, expect, it } from 'vitest';
import { flowProgress, PROGRESS_UNKNOWN_LABEL } from '../../flow-progress';
import {
  flowScrub,
  LAST_STEP,
  NOWHERE_TO_SCRUB,
  scrubbedFractionAt,
  scrubMarker,
} from './flow-scrub';

const UNKNOWN = flowProgress(null);

function at(fraction: number): ReturnType<typeof flowProgress> {
  return flowProgress({ cfi: 'epubcfi(/6/2!/4)', fraction, chapter: null });
}

describe('flowScrub', () => {
  it('offers a step for every thousandth of the book, counting both ends', () => {
    expect(LAST_STEP).toBe(1000);
    expect(flowScrub(at(0))).toEqual({ steps: 1001, at: 0 });
    expect(flowScrub(at(1))).toEqual({ steps: 1001, at: 1000 });
  });

  it('places the reader on the nearest step', () => {
    expect(flowScrub(at(0.4236))).toEqual({ steps: 1001, at: 424 });
  });

  it('offers nowhere to go while the progress is unknown', () => {
    expect(flowScrub(UNKNOWN)).toBe(NOWHERE_TO_SCRUB);
  });
});

describe('scrubbedFractionAt', () => {
  it('turns a step back into the fraction of the book it stands for', () => {
    expect(scrubbedFractionAt(0)).toBe(0);
    expect(scrubbedFractionAt(9)).toBe(0.009);
    expect(scrubbedFractionAt(300)).toBe(0.3);
    expect(scrubbedFractionAt(1000)).toBe(1);
  });
});

describe('scrubMarker', () => {
  it('prints the reported percentage at the reader’s own step', () => {
    expect(scrubMarker(at(0.1245), 125)).toBe('12%');
  });

  it('prints the percentage of a step the reader drags to', () => {
    expect(scrubMarker(at(0.1245), 675)).toBe('68%');
  });

  it('says the progress is unknown at every step', () => {
    expect(scrubMarker(UNKNOWN, 0)).toBe(PROGRESS_UNKNOWN_LABEL);
  });
});
