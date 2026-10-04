import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';

type SamplePreset = 'bubble' | 'narration' | 'second-bubble';

type SampleRegion = {
  readonly preset: SamplePreset;
  readonly label: string;
  readonly region: ImageRegion;
};

const SAMPLE_PAGE_SIZE = { width: 720, height: 960 } as const;

const SAMPLE_REGIONS: readonly SampleRegion[] = [
  {
    preset: 'bubble',
    label: 'Speech bubble',
    region: { index: imageIndex(0), rect: imageRect(382, 52, 279, 384) },
  },
  {
    preset: 'narration',
    label: 'Caption box',
    region: { index: imageIndex(0), rect: imageRect(322, 522, 345, 86) },
  },
  {
    preset: 'second-bubble',
    label: 'Second bubble',
    region: { index: imageIndex(0), rect: imageRect(372, 632, 270, 286) },
  },
];

function sampleRegion(preset: SamplePreset): ImageRegion {
  const found = SAMPLE_REGIONS.find((sample) => sample.preset === preset);
  if (found === undefined) throw new Error(`No sample region is named ${preset}`);
  return found.region;
}

function regionText(region: ImageRegion): string {
  const { x, y, width, height } = region.rect;
  const rounded = [x, y, width, height].map((value) => Math.round(value));
  return `{ index: ${region.index}, rect: { x: ${rounded[0]}, y: ${rounded[1]}, width: ${rounded[2]}, height: ${rounded[3]} } }`;
}

export { SAMPLE_PAGE_SIZE, SAMPLE_REGIONS, regionText, sampleRegion };
export type { SamplePreset, SampleRegion };
