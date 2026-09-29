import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { captureId, imageIndex } from '$lib/shared/ids';
import type { ArrivalCapture } from '../../domain/capture/capture-arrival';
import { arrivalGlow } from './capture-glow';

function onImage(id: string, index: number, x: number): ArrivalCapture {
  return {
    id: captureId(id),
    origin: 'written',
    text: id,
    anchor: regionAnchor([{ index: imageIndex(index), rect: imageRect(x, 0, 10, 10) }]),
  };
}

const RIGHT = onImage('right', 3, 50);

describe('arrivalGlow', () => {
  it('glows only the capture the arrival names, not the other one on its image', () => {
    expect(arrivalGlow({ at: RIGHT, stepping: null }).map((region) => region.rect.x)).toEqual([50]);
  });

  it('glows nothing without an arrival', () => {
    expect(arrivalGlow(null)).toEqual([]);
  });
});
