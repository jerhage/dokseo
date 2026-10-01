import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import type { Language } from '$lib/shared/language';
import type { Notice } from '$lib/shared/notice';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import type { ModelLoad, ModelLoadError } from '../../domain/model/model-load';
import type { PartialReport } from '../../domain/model/model-partial';
import { JAPANESE_OCR_MODEL, modelsFor } from '../../domain/model/model-footprint';
import { GPU_UNDETECTED } from '../../domain/engine/compute-choice';
import { setupChoice } from '../../domain/engine/recognizer-setup';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import type { ModelStorageError } from '../../domain/model/model-storage';
import type { RecognizerChoice, SetupError } from '../../domain/engine/recognizer-setup';
import { at } from '$lib/shared/testing/at';
import {
  cancelHint,
  EngineSettingsView,
  loadFigure,
  SETUP_FAILED,
  partialFigure,
  resumeLabel,
  storedFigure,
} from './engine-settings.svelte';
import { LOAD_FAILED } from './model-download.svelte';
import { REMOVAL_WARNING, REMOVE_FAILED } from './model-removal.svelte';
import { storageFailureNote } from './model-storage.svelte';
import { engineLanguages } from './engine-setup.svelte';

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

type Attempt = {
  readonly settle: (opened: Result<RecognizerSession, ModelLoadError>) => void;
};

type World = {
  view: EngineSettingsView;
  readonly attempts: Attempt[];
  readonly pauses: Language[];
  readonly cancels: string[];
  readonly grants: Language[];
  readonly closes: Language[];
  readonly notices: Notice[];
  snapshot: ModelStorageSnapshot;
  saving: Result<void, SetupError>;
  reading: Result<RecognizerChoice, SetupError>;
  readonly measured: string[];
  readonly saved: string[];
  deletes: number;
  saveGate: Promise<void> | null;
  deleting: Result<ModelStorageReport, ModelStorageError>;
};

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

function unused(): never {
  throw new Error('The engine settings screen does not use this');
}

function world(snapshot: ModelStorageSnapshot): World {
  const attempts: Attempt[] = [];
  const pauses: Language[] = [];
  const cancels: string[] = [];
  const grants: Language[] = [];
  const closes: Language[] = [];
  const notices: Notice[] = [];

  const built: World = {
    view: undefined as unknown as EngineSettingsView,
    attempts,
    pauses,
    cancels,
    grants,
    closes,
    notices,
    snapshot,
    saving: ok(undefined),
    reading: ok(setupChoice('ja', null)),
    measured: [],
    saved: [],
    deletes: 0,
    saveGate: null,
    deleting: ok(report({ files: 7, bytes: 120_000_000 })),
  };

  const container = {
    beginTrace: unused,
    library: {
      openFile: unused,
      openForReading: unused,
      listBooks: unused,
      readCover: unused,
      readSource: unused,
      removeBook: unused,
      editBook: unused,
      saveReadingPlace: unused,
      markFinished: unused,
      markUnread: unused,
      readLibrarySize: unused,
    },
    recognition: {
      readModelConsent: unused,
      grantModelConsent: (language: Language) => {
        grants.push(language);
        return Promise.resolve(ok(undefined));
      },
      recognizeRegion: unused,
      listCaptures: unused,
      listEveryCapture: unused,
      saveCapture: unused,
      editCaptureText: unused,
      removeCapture: unused,
      restoreCapture: unused,
      clearCaptures: unused,
      readModelStorage: (modelId: string) => {
        built.measured.push(modelId);
        return Promise.resolve(ok(built.snapshot));
      },
      deleteModel: () => {
        built.deletes += 1;
        return Promise.resolve(built.deleting);
      },
      readRecognizerSetup: (language: Language) =>
        Promise.resolve(built.reading.ok ? ok(setupChoice(language, null)) : built.reading),
      saveRecognizerSetup: (_language: Language, setup: { readonly modelId: string }) => {
        built.saved.push(setup.modelId);
        const gate = built.saveGate ?? Promise.resolve();
        return gate.then(() => built.saving);
      },
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
      closeRecognizer: (language: Language) => {
        closes.push(language);
        return Promise.resolve();
      },
    },
  } as unknown as Container;

  built.view = new EngineSettingsView(container, (notice) => {
    notices.push(notice);
  });
  return built;
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
  it('starts no second download while one runs', async () => {
    const built = world(snapshotOf([], 0, 0));
    await built.view.load();

    void built.view.start();
    await settled();
    void built.view.start();
    await settled();

    expect(built.attempts.length).toBe(1);
  });

  it('clears what a deletion said when a download starts', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();
    await built.view.remove();

    void built.view.start();

    expect(built.view.removal.message).toBeNull();
  });

  it('measures nothing more for a download answered after it was paused', async () => {
    const built = world(snapshotOf([], 50_000_000, 5));
    await built.view.load();
    const starting = built.view.start();
    await settled();
    await built.view.pause();
    const before = built.measured.length;

    at(built.attempts, 0).settle(ok(OPENED));
    await starting;

    expect(built.measured.length).toBe(before);
  });

  it('pauses nothing while no download runs', async () => {
    const built = world(snapshotOf([], 0, 0));
    await built.view.load();

    await built.view.pause();

    expect(built.pauses).toEqual([]);
  });

  it('forgets the download, the measure and the deletion note of the language it leaves', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();
    built.view.download.session = OPENED;
    built.view.removal.message = 'Freed 1 MB.';
    built.view.removal.ask();

    const choosing = built.view.chooseLanguage('ko');
    const during = {
      session: built.view.download.session,
      snapshot: built.view.storage.snapshot,
      message: built.view.removal.message,
      confirming: built.view.removal.confirming,
    };
    await choosing;

    expect(during).toEqual({ session: null, snapshot: null, message: null, confirming: false });
  });

  it('drops the open session when the compute choice changes', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();
    built.view.download.session = OPENED;

    await built.view.chooseCompute('gpu');

    expect(built.view.download.session).toBeNull();
  });

  it('reports nothing and measures nothing for a choice answered after the screen closed', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();
    let open: () => void = () => undefined;
    built.saveGate = new Promise<void>((resolve) => {
      open = resolve;
    });
    built.saving = err({ kind: 'storage-unavailable' });
    const before = built.measured.length;

    const choosing = built.view.chooseCompute('gpu');
    built.view.dispose();
    open();
    await choosing;

    expect(built.notices).toEqual([]);
    expect(built.measured.length).toBe(before);
  });

  it('deletes once when asked twice at once', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();

    await Promise.all([built.view.remove(), built.view.remove()]);

    expect(built.deletes).toBe(1);
    expect(built.view.removal.message).toBe(`Freed 120 MB. ${REMOVAL_WARNING}`);
  });

  it('closes the confirmation and measures again once a deletion is asked', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();
    built.view.removal.ask();
    const before = built.measured.length;

    await built.view.remove();

    expect(built.view.removal.confirming).toBe(false);
    expect(built.measured.length).toBe(before + 1);
  });

  it('ignores a download answered after the screen closed', async () => {
    const built = world(snapshotOf([], 0, 0));
    await built.view.load();
    const starting = built.view.start();
    await settled();

    built.view.dispose();
    at(built.attempts, 0).settle(ok(OPENED));
    await starting;

    expect(built.view.download.session).toBeNull();
  });

  it('measures nothing and shows no model when the setup cannot be read', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    built.reading = err({ kind: 'storage-unavailable' });

    await built.view.load();

    expect(built.view.setup.state.kind).toBe('failed');
    expect(built.view.model).toBeNull();
    expect(built.measured).toEqual([]);
  });

  it('measures the shown model once the setup is read', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));

    await built.view.load();

    expect(built.measured).toEqual([MODEL]);
    expect(built.view.storage.stored).toBe(true);
  });

  it('reads the setup of a new language, which shows as a read meanwhile', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();

    const choosing = built.view.chooseLanguage('ko');
    const during = built.view.setup.state.kind;
    await choosing;

    expect(during).toBe('loading');
    expect(built.view.language).toBe('ko');
    expect(built.view.storage.snapshot).toEqual(built.snapshot);
  });

  it('saves nothing when the selected model is chosen again', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();

    const second = at(modelsFor('ja'), 1).modelId;

    await built.view.chooseModel(second);
    await built.view.chooseModel(second);

    expect(built.saved).toEqual([second]);
  });

  it('reads nothing again when the shown language is chosen', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();

    await built.view.chooseLanguage('ja');

    expect(built.measured).toEqual([MODEL]);
  });

  it('drops the cached recognizer when the compute choice changes', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();

    await built.view.chooseCompute('gpu');
    await settled();

    expect(built.pauses).toEqual(['ja']);
    expect(built.closes).toEqual(['ja']);
  });

  it('reports a compute choice that storage refused to keep', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    built.saving = err({ kind: 'storage-failed', cause: 'quota' });
    await built.view.load();

    await built.view.chooseCompute('gpu');

    expect(built.notices).toEqual([
      { tone: 'danger', title: SETUP_FAILED, message: 'Local storage failed: quota' },
    ]);
  });

  it('reports a model choice that storage refused to keep', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    built.saving = err({ kind: 'storage-unavailable' });
    await built.view.load();

    await built.view.chooseModel('another-model');

    expect(built.notices.map((notice) => [notice.tone, notice.title])).toEqual([
      ['danger', SETUP_FAILED],
    ]);
  });

  it('reports nothing when a compute choice is kept', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();

    await built.view.chooseCompute('gpu');

    expect(built.notices).toEqual([]);
  });

  it('reports a download that failed, naming the cause', async () => {
    const built = world(snapshotOf([], 0, 0));
    await built.view.load();

    const starting = built.view.start();
    await settled();
    at(built.attempts, 0).settle(err({ kind: 'unavailable', cause: 'network down' }));
    await starting;

    expect(built.view.download.state).toEqual({ kind: 'failed', cause: 'network down' });
    expect(built.notices).toEqual([
      { tone: 'danger', title: LOAD_FAILED, message: 'network down' },
    ]);
  });

  it('reports nothing for a download that opened or was cancelled', async () => {
    const built = world(snapshotOf([], 0, 0));
    await built.view.load();

    const opening = built.view.start();
    await settled();
    at(built.attempts, 0).settle(ok(OPENED));
    await opening;

    const cancelling = built.view.start();
    await settled();
    at(built.attempts, 1).settle(err({ kind: 'cancelled' }));
    await cancelling;

    expect(built.notices).toEqual([]);
  });

  it('reports a model that could not be deleted', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    built.deleting = err({ kind: 'cache-failed', cause: 'locked' });
    await built.view.load();

    await built.view.remove();

    expect(built.notices).toEqual([
      {
        tone: 'danger',
        title: REMOVE_FAILED,
        message: 'The cache could not be read: locked',
      },
    ]);
    expect(built.view.removal.message).toBeNull();
  });

  it('says what a deletion freed, next to its button, without a toast', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();

    await built.view.remove();

    expect(built.view.removal.message).toBe(`Freed 120 MB. ${REMOVAL_WARNING}`);
    expect(built.notices).toEqual([]);
  });

  it('offers a resume when the configuration is cached and the weights are not', async () => {
    const built = world(snapshotOf([], 50_000_000, 5));
    await built.view.load();

    expect(built.view.storage.stored).toBe(false);
    expect(built.view.storage.resumable).toBe(true);
    expect(built.view.engine.partlyDownloaded).toBe(true);
  });

  it('offers no resume once both weight files are cached', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();

    expect(built.view.storage.stored).toBe(true);
    expect(built.view.storage.resumable).toBe(false);
  });

  it('offers a resume while one of the two weight files is still missing', async () => {
    const built = world(snapshotOf([REQUIRED_WEIGHTS[0] ?? ''], 0, 6));
    await built.view.load();

    expect(built.view.storage.stored).toBe(false);
    expect(built.view.storage.resumable).toBe(true);
  });

  it('records the grant for the chosen model before the download starts', async () => {
    const built = world(snapshotOf([], 0, 0));
    await built.view.load();

    expect(built.grants).toEqual([]);

    void built.view.start();
    await settled();

    expect(built.grants).toEqual(['ja']);
    expect(built.view.model?.modelId).toBe(MODEL);
    expect(built.attempts.length).toBe(1);
  });

  it('records the grant again for a download resumed from the settings screen', async () => {
    const built = world(snapshotOf([], 50_000_000, 5));
    await built.view.load();

    void built.view.start();
    await settled();

    expect(built.grants).toEqual(['ja']);
  });

  it('records no grant for merely reporting what the browser holds', async () => {
    const built = world(snapshotOf(REQUIRED_WEIGHTS, 0, 7));
    await built.view.load();

    expect(built.grants).toEqual([]);
  });

  it('holds a paused download paused when the abandoned load resolves afterwards', async () => {
    const built = world(snapshotOf([], 50_000_000, 5));
    await built.view.load();

    void built.view.start();
    await settled();
    await built.view.pause();

    built.attempts[0]?.settle({ ok: false, error: { kind: 'cancelled' } });
    await settled();

    expect(built.view.download.state.kind).toBe('paused');
    expect(built.view.storage.resumable).toBe(true);
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

    expect(built.view.download.state.kind).toBe('loading');
  });

  it('leaves a discarded download cancelled when the abandoned load resolves afterwards', async () => {
    const built = world(snapshotOf([], 50_000_000, 5));
    await built.view.load();

    void built.view.start();
    await settled();
    await built.view.stop();

    built.attempts[0]?.settle({ ok: true, value: OPENED });
    await settled();

    expect(built.view.download.state.kind).toBe('cancelled');
    expect(built.view.download.session).toBeNull();
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
  it('offers every language a model can read', () => {
    expect(engineLanguages()).toEqual(['ja', 'ko', 'en']);
  });
});
