import { describe, expect, it } from 'vitest';
import { imageRectOf, pageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { RECORDED_BUBBLE_RUN } from './ocr-recorded-run';
import { SAMPLE_PAGE_SIZE, SAMPLE_REGIONS, regionText, sampleRegion } from './ocr-sample';

describe('regionText', () => {
  it('writes the image index and the rect in fractions of the page to four decimals', () => {
    const region = { index: imageIndex(0), rect: pageRect(0.104449, 0.2, 0.30216, 0.405) };

    expect(regionText(region)).toBe(
      '{ index: 0, rect: { x: 0.1044, y: 0.2, width: 0.3022, height: 0.405 } }',
    );
  });
});

describe('the sample regions', () => {
  it('keeps every region inside the sample page', () => {
    for (const { region } of SAMPLE_REGIONS) {
      expect(region.rect.x + region.rect.width).toBeLessThanOrEqual(1);
      expect(region.rect.y + region.rect.height).toBeLessThanOrEqual(1);
    }
  });

  it('matches the crop the recorded run read', () => {
    const { width, height } = imageRectOf(sampleRegion('bubble').rect, SAMPLE_PAGE_SIZE);

    expect({ width, height }).toEqual(RECORDED_BUBBLE_RUN.crop);
  });
});
