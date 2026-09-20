import { describe, expect, it } from 'vitest';
import { INSPECTING, type UploadStage } from '../domain/ingest/upload-progress';
import { uploadCountText, uploadStageText } from './upload-progress-text';

function storing(over: Partial<Extract<UploadStage, { kind: 'storing' }>> = {}): UploadStage {
  return {
    kind: 'storing',
    imageCount: 186,
    writtenBytes: 20_000_000,
    totalBytes: 100_000_000,
    elapsedMs: 10_000,
    ...over,
  };
}

describe('uploadCountText', () => {
  it('states nothing while the page count is still unknown', () => {
    expect(uploadCountText(INSPECTING)).toBeNull();
    expect(uploadCountText({ kind: 'opening', sourceKind: 'pdf' })).toBeNull();
  });

  it('states both halves while loose images are packed', () => {
    expect(uploadCountText({ kind: 'packing', packed: 78, total: 186 })).toBe('78 / 186 pages');
  });

  it('states only the total once the count is known and nothing is being counted through', () => {
    expect(uploadCountText(storing())).toBe('186 pages');
    expect(uploadCountText({ kind: 'covering', imageCount: 186 })).toBe('186 pages');
  });

  it('singularises a one-page source', () => {
    expect(uploadCountText({ kind: 'covering', imageCount: 1 })).toBe('1 page');
  });

  it('groups a large count with thousands separators', () => {
    expect(uploadCountText({ kind: 'covering', imageCount: 1200 })).toBe('1,200 pages');
  });
});

describe('uploadStageText', () => {
  it('names the drop being read before anything is known about it', () => {
    expect(uploadStageText(INSPECTING)).toBe('Reading the drop');
  });

  it('names the kind of source being opened', () => {
    expect(uploadStageText({ kind: 'opening', sourceKind: 'pdf' })).toBe('Opening the PDF');
    expect(uploadStageText({ kind: 'opening', sourceKind: 'archive' })).toBe('Opening the archive');
    expect(uploadStageText({ kind: 'opening', sourceKind: 'images' })).toBe(
      'Opening the packed images',
    );
  });

  it('names the cover as its own stage', () => {
    expect(uploadStageText({ kind: 'covering', imageCount: 186 })).toBe('Rendering the cover');
  });

  it('adds a percentage to a stage that has one', () => {
    expect(uploadStageText({ kind: 'packing', packed: 3, total: 4 })).toBe(
      'Packing the images — 75%',
    );
  });

  it('adds a percentage and an estimate to the source write', () => {
    expect(uploadStageText(storing())).toBe('Storing the source — 20% · ~40s left');
  });

  it('omits the estimate rather than guessing one from too small a sample', () => {
    expect(uploadStageText(storing({ elapsedMs: 100 }))).toBe('Storing the source — 20%');
  });

  it('states a long estimate in minutes', () => {
    expect(uploadStageText(storing({ writtenBytes: 10_000_000, elapsedMs: 20_000 }))).toBe(
      'Storing the source — 10% · ~3m left',
    );
  });

  it('states a bare verb for a stage with neither a percentage nor an estimate', () => {
    expect(uploadStageText({ kind: 'packing', packed: 0, total: 0 })).toBe('Packing the images');
  });
});
