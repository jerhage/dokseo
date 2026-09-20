import { describe, expect, it } from 'vitest';
import type { ModelStorageReport } from '../domain/model-cache';
import type { ModelLoad } from '../domain/model-load';
import type { PartialReport } from '../domain/model-partial';
import {
  cancelHint,
  engineLanguages,
  loadFigure,
  partialFigure,
  storageFailureNote,
  storedFigure,
} from './engine-settings.svelte';

const MODEL = 'DigitalLarynx/manga-ocr-onnx';

function report(over: Partial<ModelStorageReport> = {}): ModelStorageReport {
  return { modelId: MODEL, files: 0, bytes: 0, unsized: 0, ...over };
}

function load(over: Partial<ModelLoad> = {}): ModelLoad {
  return { fraction: 0, source: 'network', loadedBytes: 0, totalBytes: 0, ...over };
}

describe('loadFigure', () => {
  it('says the load is starting before any byte was reported', () => {
    expect(loadFigure(null)).toBe('starting…');
  });

  it('reports the bytes read against the bytes known and a percentage', () => {
    const figure = loadFigure(
      load({ fraction: 0.68, loadedBytes: 281_000_000, totalBytes: 412_000_000 }),
    );

    expect(figure).toBe('281 / 412 MB · 68%');
  });

  it('reports the percentage alone when no total has been reported yet', () => {
    expect(loadFigure(load({ fraction: 0.05, loadedBytes: 1_000, totalBytes: 0 }))).toBe('5%');
  });
});

describe('cancelHint', () => {
  it('promises nothing on this device is lost when the weights are read from it', () => {
    const hint = cancelHint(load({ source: 'cache' }));

    expect(hint).toContain('stay on this device');
    expect(hint).not.toContain('fetched');
  });

  it('separates pausing from cancelling when bytes are coming over the network', () => {
    const hint = cancelHint(load({ source: 'network' }));

    expect(hint).toContain('Pausing keeps every byte already fetched');
    expect(hint).toContain('Cancelling discards');
  });

  it('says nothing about fetching before a single byte has been reported', () => {
    expect(cancelHint(null)).toBe(cancelHint(load({ source: 'cache' })));
  });
});

describe('partialFigure', () => {
  function partial(over: Partial<PartialReport> = {}): PartialReport {
    return { modelId: MODEL, files: 0, bytes: 0, ...over };
  }

  it('says nothing when no part-downloaded file is held', () => {
    expect(partialFigure(partial())).toBeNull();
  });

  it('says nothing when the part-downloads could not be read', () => {
    expect(partialFigure(null)).toBeNull();
  });

  it('reports what a part-downloaded file holds and that a resume will use it', () => {
    expect(partialFigure(partial({ files: 1, bytes: 62_000_000 }))).toBe(
      '62 MB of 1 file part-downloaded, kept for a resume',
    );
  });
});

describe('storedFigure', () => {
  it('says nothing is downloaded when the cache holds no file of the model', () => {
    expect(storedFigure(report())).toBe('Not downloaded');
  });

  it('reports the bytes the browser holds and how many files hold them', () => {
    expect(storedFigure(report({ files: 9, bytes: 204_413_485 }))).toBe('204 MB in 9 files');
  });

  it('counts a single file in the singular', () => {
    expect(storedFigure(report({ files: 1, bytes: 1_000_000 }))).toBe('1 MB in 1 file');
  });

  it('admits when a stored file reported no size rather than guessing one', () => {
    const figure = storedFigure(report({ files: 3, bytes: 2_000_000, unsized: 1 }));
    expect(figure).toBe('2 MB in 3 files, 1 of unreported size');
  });
});

describe('storageFailureNote', () => {
  it('names the cause when the cache could be opened but not read', () => {
    expect(storageFailureNote({ kind: 'cache-failed', cause: 'quota exceeded' })).toContain(
      'quota exceeded',
    );
  });

  it('says the browser exposes no cache at all', () => {
    expect(storageFailureNote({ kind: 'cache-unavailable' })).toContain('no cache');
  });
});

describe('engineLanguages', () => {
  it('offers only the languages a model has been chosen for', () => {
    expect(engineLanguages()).toEqual(['ja']);
  });
});
