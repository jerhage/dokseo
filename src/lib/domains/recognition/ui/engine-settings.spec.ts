import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import type { Language } from '$lib/shared/language';
import { ok, type Result } from '$lib/shared/result';
import type { ModelStorageReport } from '../domain/model-cache';
import type { ModelLoad, ModelLoadError } from '../domain/model-load';
import type { PartialReport } from '../domain/model-partial';
import { REQUIRED_WEIGHTS } from '../domain/model-weights';
import { GPU_UNDETECTED } from '../domain/compute-choice';
import { setupChoice } from '../domain/recognizer-setup';
import type { RecognizerSession } from '../domain/recognizer-session';
import type { ModelStorageSnapshot } from '../use-cases/read-model-storage';
import {
  cancelHint,
  engineLanguages,
  EngineSettingsView,
  loadFigure,
  partialFigure,
  resumeLabel,
  storageFailureNote,
  storedFigure,
} from './engine-settings.svelte';

const MODEL = 'DigitalLarynx/manga-ocr-onnx';

const OPENED: RecognizerSession = { modelId: MODEL, device: 'webgpu' };

function report(over: Partial<ModelStorageReport> = {}): ModelStorageReport {
  return { modelId: MODEL, files: 0, bytes: 0, unsized: 0, weights: REQUIRED_WEIGHTS, ...over };
}

type Attempt = {
  readonly settle: (opened: Result<RecognizerSession, ModelLoadError>) => void;
};

type World = {
  readonly view: EngineSettingsView;
  readonly attempts: Attempt[];
  readonly pauses: Language[];
  readonly cancels: string[];
  snapshot: ModelStorageSnapshot;
};

function snapshotOf(
  weights: readonly string[],
  partialBytes: number,
  files: number,
): ModelStorageSnapshot {
  return {
    report: { modelId: MODEL, files, bytes: 400_000, unsized: 0, weights },
    partial: { modelId: MODEL, files: partialBytes > 0 ? 2 : 0, bytes: partialBytes },
    usage: 241_000_000,
    quota: 10_979_000_000,
    persisted: true,
  };
}

function unused(): never {
  throw new Error('The engine settings screen does not use this');
}

function world(snapshot: ModelStorageSnapshot): World {
  const attempts: Attempt[] = [];
  const pauses: Language[] = [];
  const cancels: string[] = [];

  const built: World = {
    view: undefined as unknown as EngineSettingsView,
    attempts,
    pauses,
    cancels,
    snapshot,
  };

  const container = {
    beginTrace: unused,
    library: {
      openFile: unused,
      openForReading: unused,
      listBooks: unused,
      readCover: unused,
      removeBook: unused,
      editBook: unused,
      readStorageUsage: unused,
    },
    recognition: {
      readModelConsent: unused,
      grantModelConsent: unused,
      recognizeRegion: unused,
      listCaptures: unused,
      saveCapture: unused,
      editCaptureText: unused,
      removeCapture: unused,
      clearCaptures: unused,
      readModelStorage: () => Promise.resolve(ok(built.snapshot)),
      deleteModel: unused,
      readRecognizerSetup: (language: Language) => Promise.resolve(ok(setupChoice(language, null))),
      saveRecognizerSetup: () => Promise.resolve(ok(undefined)),
      detectCompute: () => Promise.resolve(GPU_UNDETECTED),
      prepareRecognizer: () =>
        new Promise<Result<RecognizerSession, ModelLoadError>>((resolve) => {
          attempts.push({ settle: resolve });
        }),
      pauseModelLoad: (language: Language) => {
        pauses.push(language);
        return Promise.resolve();
      },
      cancelModelLoad: (_language: Language, modelId: string) => {
        cancels.push(modelId);
        return Promise.resolve(null);
      },
      closeRecognizer: unused,
    },
  } as unknown as Container;

  return { ...built, view: new EngineSettingsView(container) };
}

async function settled(): Promise<void> {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
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

  it('measures in kilobytes rather than printing a rounded zero beside a file count', () => {
    const figure = storedFigure(report({ files: 5, bytes: 382_400, weights: [] }));

    expect(figure).toContain('382 kB in 5 files');
    expect(figure).not.toContain('0 MB');
  });

  it('says the weights are missing when only the configuration is cached', () => {
    expect(storedFigure(report({ files: 5, bytes: 382_400, weights: [] }))).toContain(
      'but not the weights',
    );
  });
});

describe('EngineSettingsView', () => {
  it('offers a resume when the configuration is cached and the weights are not', async () => {
    const built = world(snapshotOf([], 50_000_000, 5));
    await built.view.load();

    expect(built.view.stored).toBe(false);
    expect(built.view.resumable).toBe(true);
    expect(built.view.engine.partlyDownloaded).toBe(true);
  });

  it('offers no resume once both weight files are cached', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();

    expect(built.view.stored).toBe(true);
    expect(built.view.resumable).toBe(false);
  });

  it('offers a resume while one of the two weight files is still missing', async () => {
    const built = world(snapshotOf([REQUIRED_WEIGHTS[0] ?? ''], 0, 6));
    await built.view.load();

    expect(built.view.stored).toBe(false);
    expect(built.view.resumable).toBe(true);
  });

  it('holds a paused download paused when the abandoned load resolves afterwards', async () => {
    const built = world(snapshotOf([], 50_000_000, 5));
    await built.view.load();

    void built.view.start();
    await settled();
    await built.view.pause();

    built.attempts[0]?.settle({ ok: false, error: { kind: 'cancelled' } });
    await settled();

    expect(built.view.download.kind).toBe('paused');
    expect(built.view.resumable).toBe(true);
  });

  it('keeps a resumed download running when the first attempt resolves afterwards', async () => {
    const built = world(snapshotOf([], 50_000_000, 5));
    await built.view.load();

    void built.view.start();
    await settled();
    await built.view.pause();

    void built.view.start();
    await settled();

    built.attempts[0]?.settle({ ok: false, error: { kind: 'cancelled' } });
    await settled();

    expect(built.view.download.kind).toBe('loading');
  });

  it('leaves a discarded download cancelled when the abandoned load resolves afterwards', async () => {
    const built = world(snapshotOf([], 50_000_000, 5));
    await built.view.load();

    void built.view.start();
    await settled();
    await built.view.stop();

    built.attempts[0]?.settle({ ok: true, value: OPENED });
    await settled();

    expect(built.view.download.kind).toBe('cancelled');
    expect(built.view.session).toBeNull();
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
