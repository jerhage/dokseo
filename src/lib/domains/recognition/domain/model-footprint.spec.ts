import { describe, expect, it } from 'vitest';
import {
  downloadMb,
  megabytes,
  modelFootprint,
  onDiskMb,
  type ModelFootprint,
} from './model-footprint';

function japanese(): ModelFootprint {
  const footprint = modelFootprint('ja');
  if (footprint === null) throw new Error('Japanese has a model to download');
  return footprint;
}

describe('modelFootprint', () => {
  it('reports about 211 MB over the wire for Japanese', () => {
    expect(downloadMb(japanese())).toBe(211);
  });

  it('reports about 231 MB on disk for Japanese, 20 MB above the download', () => {
    expect(onDiskMb(japanese())).toBe(231);
    expect(onDiskMb(japanese()) - downloadMb(japanese())).toBe(20);
  });

  it('charges the weights the same either way and only unpacks the runtime', () => {
    const footprint = japanese();
    expect(megabytes(footprint.weightsBytes)).toBe(204);
    expect(megabytes(footprint.runtimeDownloadBytes, 1)).toBe(6.6);
    expect(megabytes(footprint.runtimeOnDiskBytes)).toBe(27);
  });

  it('rounds once from the exact bytes rather than summing rounded figures', () => {
    const footprint: ModelFootprint = {
      modelId: 'an/exact-rounding-check',
      weightsBytes: 1_600_000,
      runtimeDownloadBytes: 1_600_000,
      runtimeOnDiskBytes: 1_600_000,
    };

    const summed = megabytes(footprint.weightsBytes) + megabytes(footprint.runtimeOnDiskBytes);
    expect(summed).toBe(4);
    expect(onDiskMb(footprint)).toBe(3);
    expect(downloadMb(footprint)).toBe(3);
  });

  it('names the model the bytes were measured from, so the two cannot drift apart', () => {
    expect(japanese().modelId).toBe('DigitalLarynx/manga-ocr-onnx');
  });

  it('reports no footprint for a language whose model has not been chosen', () => {
    expect(modelFootprint('ko')).toBeNull();
  });
});
