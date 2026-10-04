import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { RECORDED_BUBBLE_RUN } from './ocr-recorded-run';
import { SAMPLE_PAGE_SIZE, SAMPLE_REGIONS, regionText, sampleRegion } from './ocr-sample';

describe('regionText', () => {
  it('writes the image index and the rect in whole pixels', () => {
    const region = { index: imageIndex(0), rect: imageRect(10.4, 20.6, 30.2, 40.5) };

    expect(regionText(region)).toBe('{ index: 0, rect: { x: 10, y: 21, width: 30, height: 41 } }');
  });
});

describe('the sample regions', () => {
  it('keeps every region inside the sample page', () => {
    for (const { region } of SAMPLE_REGIONS) {
      expect(region.rect.x + region.rect.width).toBeLessThanOrEqual(SAMPLE_PAGE_SIZE.width);
      expect(region.rect.y + region.rect.height).toBeLessThanOrEqual(SAMPLE_PAGE_SIZE.height);
    }
  });

  it('matches the crop the recorded run read', () => {
    const { width, height } = sampleRegion('bubble').rect;

    expect({ width, height }).toEqual(RECORDED_BUBBLE_RUN.crop);
  });
});
