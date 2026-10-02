import { describe, expect, it } from 'vitest';
import { INSPECTING, SINGLE_BOOK } from '../domain/ingest/upload-progress';
import type { UploadStage } from '../domain/ingest/upload-progress';
import {
  uploadBatchText,
  uploadCountText,
  uploadStageText,
  uploadsInProgressText,
} from './upload-progress-text';

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
  it.each([
    { stage: INSPECTING, text: 'Reading the drop' },
    { stage: { kind: 'opening', sourceKind: 'pdf' }, text: 'Opening the PDF' },
    { stage: { kind: 'opening', sourceKind: 'archive' }, text: 'Opening the archive' },
    { stage: { kind: 'opening', sourceKind: 'images' }, text: 'Opening the packed images' },
    { stage: { kind: 'covering', imageCount: 186 }, text: 'Rendering the cover' },
  ] as const)('names the $stage.kind stage as $text', ({ stage, text }) => {
    expect(uploadStageText(stage)).toBe(text);
  });

  it('adds a percentage to a stage that has one', () => {
    expect(uploadStageText({ kind: 'packing', packed: 3, total: 4 })).toBe(
      'Packing the images — 75%',
    );
  });

  it('adds a percentage and an estimate to the source write', () => {
    expect(uploadStageText(storing())).toBe('Storing the source — 20% · ~40s left');
  });

  it.each([
    { writtenBytes: 50_000_000, elapsedMs: 89_000, text: 'Storing the source — 50% · ~89s left' },
    { writtenBytes: 50_000_000, elapsedMs: 90_000, text: 'Storing the source — 50% · ~2m left' },
    { writtenBytes: 50_000_000, elapsedMs: 130_000, text: 'Storing the source — 50% · ~3m left' },
    { writtenBytes: 10_000_000, elapsedMs: 20_000, text: 'Storing the source — 10% · ~3m left' },
  ])(
    'states an estimate from a minute and a half up in whole minutes, rounded up: $text',
    ({ writtenBytes, elapsedMs, text }) => {
      expect(uploadStageText(storing({ writtenBytes, elapsedMs }))).toBe(text);
    },
  );

  it('states a bare verb for a stage with neither a percentage nor an estimate', () => {
    expect(uploadStageText({ kind: 'packing', packed: 0, total: 0 })).toBe('Packing the images');
  });
});

describe('uploadBatchText', () => {
  it('states nothing when the upload is a single book', () => {
    expect(uploadBatchText(SINGLE_BOOK)).toBeNull();
  });

  it('states which book of how many is being added', () => {
    expect(uploadBatchText({ position: 2, total: 3 })).toBe('Book 2 of 3');
  });
});

describe('uploadsInProgressText', () => {
  it('counts the books still to add, the current one included, falling as each finishes', () => {
    expect(
      [1, 2, 3, 4, 5].map((position) => uploadsInProgressText({ position, total: 5 })),
    ).toEqual([
      '5 uploads in progress',
      '4 uploads in progress',
      '3 uploads in progress',
      '2 uploads in progress',
      '1 upload in progress',
    ]);
  });
});
