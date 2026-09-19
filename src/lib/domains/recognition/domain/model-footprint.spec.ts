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
  it('reports about 123 MB over the wire for Japanese', () => {
    expect(downloadMb(japanese())).toBe(123);
  });

  it('reports about 143 MB on disk for Japanese, 20 MB above the download', () => {
    expect(onDiskMb(japanese())).toBe(143);
    expect(onDiskMb(japanese()) - downloadMb(japanese())).toBe(20);
  });

  it('charges the weights the same either way and only unpacks the runtime', () => {
    const footprint = japanese();
    expect(megabytes(footprint.weightsBytes)).toBe(117);
    expect(megabytes(footprint.runtimeDownloadBytes, 1)).toBe(6.6);
    expect(megabytes(footprint.runtimeOnDiskBytes)).toBe(27);
  });

  it('rounds once from the exact bytes rather than summing rounded figures', () => {
    const footprint = japanese();
    const summed = megabytes(footprint.weightsBytes) + megabytes(footprint.runtimeOnDiskBytes);
    expect(summed).toBe(144);
    expect(onDiskMb(footprint)).toBe(143);
  });

  it('reports no footprint for a language whose model has not been chosen', () => {
    expect(modelFootprint('ko')).toBeNull();
  });
});
