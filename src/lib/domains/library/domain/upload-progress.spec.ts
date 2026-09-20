import { describe, expect, it } from 'vitest';
import {
  INSPECTING,
  uploadCount,
  uploadFraction,
  uploadRemainingSeconds,
  type UploadStage,
} from './upload-progress';

function storing(over: Partial<Extract<UploadStage, { kind: 'storing' }>> = {}): UploadStage {
  return {
    kind: 'storing',
    imageCount: 186,
    writtenBytes: 50_000_000,
    totalBytes: 100_000_000,
    elapsedMs: 10_000,
    ...over,
  };
}

describe('uploadCount', () => {
  it('reports no count while the drop is being inspected', () => {
    expect(uploadCount(INSPECTING)).toBeNull();
  });

  it('reports no count while the source is being opened, because the page count is unknown', () => {
    expect(uploadCount({ kind: 'opening', sourceKind: 'pdf' })).toBeNull();
  });

  it('reports both halves of the count while loose images are packed', () => {
    expect(uploadCount({ kind: 'packing', packed: 78, total: 186 })).toEqual({
      done: 78,
      total: 186,
    });
  });

  it('reports a total with no done half while the source is stored', () => {
    expect(uploadCount(storing())).toEqual({ done: null, total: 186 });
  });

  it('reports a total with no done half while the cover is rendered', () => {
    expect(uploadCount({ kind: 'covering', imageCount: 186 })).toEqual({ done: null, total: 186 });
  });
});

describe('uploadFraction', () => {
  it('reports no fraction while the drop is being inspected', () => {
    expect(uploadFraction(INSPECTING)).toBeNull();
  });

  it('reports no fraction while the source is being opened', () => {
    expect(uploadFraction({ kind: 'opening', sourceKind: 'archive' })).toBeNull();
  });

  it('reports no fraction while the cover is rendered', () => {
    expect(uploadFraction({ kind: 'covering', imageCount: 4 })).toBeNull();
  });

  it('divides packed images by the total', () => {
    expect(uploadFraction({ kind: 'packing', packed: 3, total: 4 })).toBe(0.75);
  });

  it('divides written bytes by the total bytes', () => {
    expect(uploadFraction(storing({ writtenBytes: 25, totalBytes: 100 }))).toBe(0.25);
  });

  it('reports no fraction when the total is zero rather than dividing by it', () => {
    expect(uploadFraction({ kind: 'packing', packed: 0, total: 0 })).toBeNull();
    expect(uploadFraction(storing({ writtenBytes: 0, totalBytes: 0 }))).toBeNull();
  });

  it('clamps a fraction to one', () => {
    expect(uploadFraction(storing({ writtenBytes: 120, totalBytes: 100 }))).toBe(1);
  });
});

describe('uploadRemainingSeconds', () => {
  it('estimates the remaining seconds from the bytes written so far', () => {
    const estimate = uploadRemainingSeconds(
      storing({ writtenBytes: 20_000_000, totalBytes: 100_000_000, elapsedMs: 10_000 }),
    );
    expect(estimate).toBe(40);
  });

  it('estimates nothing for a stage that writes no bytes', () => {
    expect(uploadRemainingSeconds(INSPECTING)).toBeNull();
    expect(uploadRemainingSeconds({ kind: 'packing', packed: 3, total: 4 })).toBeNull();
    expect(uploadRemainingSeconds({ kind: 'opening', sourceKind: 'pdf' })).toBeNull();
    expect(uploadRemainingSeconds({ kind: 'covering', imageCount: 4 })).toBeNull();
  });

  it('estimates nothing before any byte has landed', () => {
    expect(uploadRemainingSeconds(storing({ writtenBytes: 0 }))).toBeNull();
  });

  it('estimates nothing from too short a sample', () => {
    expect(uploadRemainingSeconds(storing({ elapsedMs: 120 }))).toBeNull();
  });

  it('estimates nothing from too small a share of the bytes', () => {
    expect(
      uploadRemainingSeconds(storing({ writtenBytes: 1_000_000, totalBytes: 100_000_000 })),
    ).toBeNull();
  });

  it('estimates nothing once every byte is written', () => {
    expect(uploadRemainingSeconds(storing({ writtenBytes: 100, totalBytes: 100 }))).toBeNull();
  });

  it('rounds a sub-second remainder up to one second rather than to zero', () => {
    expect(
      uploadRemainingSeconds(
        storing({ writtenBytes: 99_000_000, totalBytes: 100_000_000, elapsedMs: 1000 }),
      ),
    ).toBe(1);
  });
});
