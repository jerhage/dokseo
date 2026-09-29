import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { captureId, imageIndex } from '$lib/shared/ids';
import type { ArrivalCapture } from '../../domain/capture/capture-arrival';
import { arrivalGlow, everyOtherGlow } from './capture-glow';

function onImage(id: string, index: number, x: number): ArrivalCapture {
  return {
    id: captureId(id),
    origin: 'written',
    text: id,
    anchor: regionAnchor([{ index: imageIndex(index), rect: imageRect(x, 0, 10, 10) }]),
  };
}

const LEFT = onImage('left', 3, 0);
const RIGHT = onImage('right', 3, 50);
const LATER = onImage('later', 8, 0);
const LIFTED: ArrivalCapture = {
  id: captureId('lifted'),
  origin: 'lifted',
  text: '海',
  note: null,
  anchor: textAnchor('epubcfi(/6/2)', { exact: '海', prefix: '', suffix: '' }),
};

describe('arrivalGlow', () => {
  it('glows only the capture the arrival names, not the other one on its image', () => {
    expect(arrivalGlow({ at: RIGHT, stepping: null }).map((region) => region.rect.x)).toEqual([50]);
  });

  it('glows nothing without an arrival', () => {
    expect(arrivalGlow(null)).toEqual([]);
  });
});

describe('everyOtherGlow', () => {
  it('glows every capture on an image except the one the arrival names', () => {
    expect(
      everyOtherGlow([LEFT, RIGHT, LATER, LIFTED], { at: RIGHT, stepping: null }).map((region) => [
        region.index,
        region.rect.x,
      ]),
    ).toEqual([
      [3, 0],
      [8, 0],
    ]);
  });

  it('glows every capture on an image when the url names none', () => {
    expect(everyOtherGlow([LEFT, RIGHT, LIFTED], null)).toHaveLength(2);
  });
});
