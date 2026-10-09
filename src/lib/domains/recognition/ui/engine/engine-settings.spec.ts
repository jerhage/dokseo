import { describe, expect, it } from 'vitest';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import type { ModelLoad } from '../../domain/model/model-load';
import type { PartialReport } from '../../domain/model/model-partial';
import { IDLE } from '../../domain/model/model-download';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import {
  cancelHint,
  engineStateOf,
  loadFigure,
  partialFigure,
  resumeLabel,
  storedFigure,
} from './engine-settings.svelte';
import { engineLanguages, firstEngineLanguage } from './engine-setup';

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

const MODEL = JAPANESE_OCR_MODEL.modelId;

const OPENED: RecognizerSession = { modelId: MODEL, device: 'webgpu', fellBackFrom: null };

function report(over: Partial<ModelStorageReport> = {}): ModelStorageReport {
  return {
    modelId: MODEL,
    files: 0,
    bytes: 0,
    unsized: 0,
    required: REQUIRED_WEIGHTS,
    weights: REQUIRED_WEIGHTS,
    ...over,
  };
}

function snapshotOf(
  weights: readonly string[],
  partialBytes: number,
  files: number,
): ModelStorageSnapshot {
  return {
    report: {
      modelId: MODEL,
      files,
      bytes: 400_000,
      unsized: 0,
      required: REQUIRED_WEIGHTS,
      weights,
    },
    partial: { modelId: MODEL, files: partialBytes > 0 ? 2 : 0, bytes: partialBytes },
    usage: 241_000_000,
    quota: 10_979_000_000,
    persisted: true,
  };
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

  it.each([
    ['no part-downloaded file is held', partial()],
    ['the part-downloads could not be read', null],
  ])('says nothing when %s', (_name, held) => {
    expect(partialFigure(held)).toBeNull();
  });

  it('reports what a part-downloaded file holds and that a resume will use it', () => {
    expect(partialFigure(partial({ files: 1, bytes: 62_000_000 }))).toBe(
      '62 MB of 1 file part-downloaded, kept for a resume',
    );
  });

  it('promises no resume for a leftover beside a model the cache already holds in full', () => {
    const figure = partialFigure(partial({ files: 1, bytes: 117_445_718 }), true);

    expect(figure).toContain('no longer needed');
    expect(figure).not.toContain('resume');
  });
});

describe('resumeLabel', () => {
  it('names the bytes already on this device, so the button says what it would carry on from', () => {
    expect(resumeLabel({ modelId: MODEL, files: 2, bytes: 50_000_000 })).toBe(
      'Resume the download · 50 MB already here',
    );
  });

  it('offers a bare resume when no part-downloaded file was measured', () => {
    expect(resumeLabel(null)).toBe('Resume the download');
  });
});

describe('storedFigure', () => {
  it('says nothing is downloaded when the cache holds no file of the model', () => {
    expect(storedFigure(report({ weights: [] }))).toBe('Not downloaded');
  });

  it.each([
    [9, 204_413_485, '204 MB in 9 files'],
    [1, 1_000_000, '1 MB in 1 file'],
  ])('reports the bytes the browser holds and how many files hold them', (files, bytes, figure) => {
    expect(storedFigure(report({ files, bytes }))).toBe(figure);
  });

  it('admits when a stored file reported no size rather than guessing one', () => {
    const figure = storedFigure(report({ files: 3, bytes: 2_000_000, unsized: 1 }));
    expect(figure).toBe('2 MB in 3 files, 1 of unreported size');
  });

  it('measures in kilobytes and says the weights are missing when only the configuration is cached', () => {
    expect(storedFigure(report({ files: 5, bytes: 382_400, weights: [] }))).toBe(
      '382 kB in 5 files, but not the weights',
    );
  });
});

describe('engineStateOf', () => {
  it('offers no resume once both weight files are cached', () => {
    const engine = engineStateOf(IDLE, null, snapshotOf(REQUIRED_WEIGHTS, 0, 7));

    expect(engine.stored).toBe(true);
    expect(engine.partlyDownloaded).toBe(false);
  });

  it('offers a resume while one of the two weight files is still missing', () => {
    const engine = engineStateOf(IDLE, null, snapshotOf([REQUIRED_WEIGHTS[0] ?? ''], 0, 6));

    expect(engine.stored).toBe(false);
    expect(engine.partlyDownloaded).toBe(true);
  });

  it('reports nothing stored before the storage is read', () => {
    const engine = engineStateOf(IDLE, null, null);

    expect(engine.stored).toBe(false);
    expect(engine.partlyDownloaded).toBe(false);
  });

  it('reports an opening download with its load', () => {
    const progress = load({ fraction: 0.5 });
    const engine = engineStateOf({ kind: 'loading', load: progress }, null, null);

    expect(engine).toMatchObject({ opening: true, load: progress, failure: null });
  });

  it('reports a failed download with its cause', () => {
    const engine = engineStateOf({ kind: 'failed', cause: 'no memory' }, null, null);

    expect(engine).toMatchObject({ opening: false, load: null, failure: 'no memory' });
  });

  it('takes the session of a ready download over the one held beside it', () => {
    const ready = { ...OPENED, device: 'wasm' as const };

    expect(engineStateOf({ kind: 'ready', session: ready }, OPENED, null).session).toBe(ready);
    expect(engineStateOf(IDLE, OPENED, null).session).toBe(OPENED);
  });

  it('reports a paused and a cancelled download apart', () => {
    expect(engineStateOf({ kind: 'paused', load: null }, null, null)).toMatchObject({
      paused: true,
      cancelled: false,
    });
    expect(engineStateOf({ kind: 'cancelled' }, null, null)).toMatchObject({
      paused: false,
      cancelled: true,
    });
  });
});

describe('engineLanguages', () => {
  it('offers every language a model can read', () => {
    expect(engineLanguages()).toEqual(['ja', 'ko', 'en']);
  });
});

describe('firstEngineLanguage', () => {
  it('starts on the first language a model can read', () => {
    expect(firstEngineLanguage()).toBe('ja');
  });
});
