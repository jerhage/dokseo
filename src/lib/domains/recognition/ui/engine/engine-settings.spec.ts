import type { QueryClient } from '@tanstack/svelte-query';
import { describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import type { Language } from '$lib/shared/language';
import type { Notice } from '$lib/shared/notice';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import type { ModelLoad, ModelLoadError } from '../../domain/model/model-load';
import type { PartialReport } from '../../domain/model/model-partial';
import { JAPANESE_OCR_MODEL, modelsFor } from '../../domain/model/model-footprint';
import { GPU_UNDETECTED } from '../../domain/engine/compute-choice';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import type { ModelStorageError } from '../../domain/model/model-storage';
import type { SetupError } from '../../domain/engine/recognizer-setup';
import { offeredModels } from '../../queries/engine-queries';
import type { LanguageSetup, OfferedModels } from '../../queries/engine-queries';
import { recognitionKeys } from '../../queries/recognition-keys';
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
import { engineLanguages } from './engine-setup.svelte';
import type { EngineChoice } from './engine-setup.svelte';

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

const MODEL = JAPANESE_OCR_MODEL.modelId;

const OPENED: RecognizerSession = { modelId: MODEL, device: 'webgpu', fellBackFrom: null };

const SECOND = at(modelsFor('ja'), 1).modelId;

const CHOICE: LanguageSetup = {
  language: 'ja',
  models: offeredModels('ja') as OfferedModels,
  selected: null,
  compute: 'auto',
};

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
  readonly client: QueryClient;
  readonly attempts: Attempt[];
  readonly pauses: Language[];
  readonly cancels: string[];
  readonly grants: Language[];
  readonly closes: Language[];
  readonly notices: Notice[];
  readonly saved: string[];
  saving: Result<void, SetupError>;
  deletes: number;
  saveGate: Promise<void> | null;
  deleting: Result<ModelStorageReport, ModelStorageError>;
  refreshed(): unknown[];
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

function world(): World {
  const client = createTestQueryClient();
  const invalidations = vi.spyOn(client, 'invalidateQueries');

  const built: World = {
    view: undefined as unknown as EngineSettingsView,
    client,
    attempts: [] as Attempt[],
    pauses: [] as Language[],
    cancels: [] as string[],
    grants: [] as Language[],
    closes: [] as Language[],
    notices: [] as Notice[],
    saved: [] as string[],
    saving: ok(undefined) as Result<void, SetupError>,
    deletes: 0,
    saveGate: null as Promise<void> | null,
    deleting: ok(report({ files: 7, bytes: 120_000_000 })) as Result<
      ModelStorageReport,
      ModelStorageError
    >,
    refreshed: () => invalidations.mock.calls.map(([filters]) => filters?.queryKey),
  };

  const container = {
    recognition: {
      grantModelConsent: (language: Language) => {
        built.grants.push(language);
        return Promise.resolve(ok(undefined));
      },
      deleteModel: () => {
        built.deletes += 1;
        return Promise.resolve(built.deleting);
      },
      saveRecognizerSetup: (_language: Language, setup: { readonly modelId: string }) => {
        built.saved.push(setup.modelId);
        const gate = built.saveGate ?? Promise.resolve();
        return gate.then(() => built.saving);
      },
      prepareRecognizer: () =>
        new Promise<Result<RecognizerSession, ModelLoadError>>((resolve) => {
          built.attempts.push({ settle: resolve });
        }),
      pauseModelLoad: (language: Language) => {
        built.pauses.push(language);
        return Promise.resolve();
      },
      cancelModelLoad: (_language: Language, modelId: string) => {
        built.cancels.push(modelId);
        return Promise.resolve(null);
      },
      closeRecognizer: (language: Language) => {
        built.closes.push(language);
        return Promise.resolve();
      },
    },
  } as unknown as Container;

  built.view = new EngineSettingsView(
    container,
    (notice) => {
      built.notices.push(notice);
    },
    client,
  );
  return built;
}

const STORAGE_KEY = recognitionKeys.modelStorage(MODEL);

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
  it('asks first for the first language a model reads', () => {
    expect(world().view.language).toBe(engineLanguages()[0]);
  });

  it('starts no second download while one runs', async () => {
    const built = world();

    void built.view.start(CHOICE);
    await settled();
    void built.view.start(CHOICE);
    await settled();

    expect(built.attempts.length).toBe(1);
  });

  it('clears what a deletion said when a download starts', async () => {
    const built = world();
    await built.view.remove(CHOICE);

    void built.view.start(CHOICE);

    expect(built.view.removal.message).toBeNull();
  });

  it('refreshes the storage of the shown model once a download settles', async () => {
    const built = world();
    const starting = built.view.start(CHOICE);
    await settled();

    at(built.attempts, 0).settle(ok(OPENED));
    await starting;

    expect(built.refreshed()).toEqual([STORAGE_KEY]);
  });

  it('refreshes nothing more for a download answered after it was paused', async () => {
    const built = world();
    const starting = built.view.start(CHOICE);
    await settled();
    await built.view.pause(CHOICE);
    const before = built.refreshed().length;

    at(built.attempts, 0).settle(ok(OPENED));
    await starting;

    expect(before).toBe(1);
    expect(built.refreshed().length).toBe(before);
  });

  it('pauses nothing while no download runs', async () => {
    const built = world();

    await built.view.pause(CHOICE);

    expect(built.pauses).toEqual([]);
    expect(built.refreshed()).toEqual([]);
  });

  it('forgets the download and the deletion note of the language it leaves', () => {
    const built = world();
    built.view.download.session = OPENED;
    built.view.removal.message = 'Freed 1 MB.';
    built.view.removal.ask(true);

    built.view.chooseLanguage('ko');

    expect({
      language: built.view.language,
      session: built.view.download.session,
      message: built.view.removal.message,
      confirming: built.view.removal.confirming,
    }).toEqual({ language: 'ko', session: null, message: null, confirming: false });
  });

  it('forgets nothing when the shown language is chosen', () => {
    const built = world();
    built.view.download.session = OPENED;
    built.view.removal.message = 'Freed 1 MB.';

    built.view.chooseLanguage('ja');

    expect(built.view.download.session).toBe(OPENED);
    expect(built.view.removal.message).toBe('Freed 1 MB.');
  });

  it('drops a download answered after the language changed', async () => {
    const built = world();
    const starting = built.view.start(CHOICE);
    await settled();

    built.view.chooseLanguage('ko');
    at(built.attempts, 0).settle(ok(OPENED));
    await starting;

    expect(built.view.download.session).toBeNull();
    expect(built.refreshed()).toEqual([]);
  });

  it('drops the open session when the compute choice changes', async () => {
    const built = world();
    built.view.download.session = OPENED;

    await built.view.chooseCompute(CHOICE, 'gpu');

    expect(built.view.download.session).toBeNull();
  });

  it('records the chosen model in the cached setup before the save answers', async () => {
    const built = world();
    built.client.setQueryData(recognitionKeys.setup('ja'), CHOICE);
    let open: () => void = () => undefined;
    built.saveGate = new Promise<void>((resolve) => {
      open = resolve;
    });

    const choosing = built.view.chooseModel(CHOICE, SECOND);
    await settled();
    const during = built.client.getQueryData(recognitionKeys.setup('ja'));
    open();
    await choosing;

    expect(during).toEqual({ ...CHOICE, selected: SECOND });
    expect(built.saved).toEqual([SECOND]);
  });

  it('records the chosen compute in the cached setup, and nothing beyond the setup', async () => {
    const built = world();

    const shown: EngineChoice = { ...CHOICE, detection: GPU_UNDETECTED };

    await built.view.chooseCompute(shown, 'cpu');

    expect(built.client.getQueryData(recognitionKeys.setup('ja'))).toEqual({
      ...CHOICE,
      compute: 'cpu',
    });
  });

  it('keeps the chosen model when a setup read in flight answers afterwards', async () => {
    const built = world();
    built.client.setQueryData(recognitionKeys.setup('ja'), CHOICE);
    let answer: (setup: LanguageSetup) => void = () => undefined;
    void built.client
      .fetchQuery({
        queryKey: recognitionKeys.setup('ja'),
        queryFn: () =>
          new Promise<LanguageSetup>((resolve) => {
            answer = resolve;
          }),
        staleTime: 0,
      })
      .catch(() => undefined);

    await built.view.chooseModel(CHOICE, SECOND);
    answer(CHOICE);
    await settled();

    expect(built.client.getQueryData(recognitionKeys.setup('ja'))).toEqual({
      ...CHOICE,
      selected: SECOND,
    });
  });

  it('refreshes the storage of the newly chosen model after a setup change', async () => {
    const built = world();

    await built.view.chooseModel(CHOICE, SECOND);

    expect(built.refreshed()).toEqual([recognitionKeys.modelStorage(SECOND)]);
  });

  it('marks the cached storage for a fresh read once it refreshes', async () => {
    const built = world();
    built.client.setQueryData(STORAGE_KEY, snapshotOf(REQUIRED_WEIGHTS, 0, 7));

    await built.view.chooseCompute(CHOICE, 'gpu');

    expect(built.client.getQueryState(STORAGE_KEY)?.isInvalidated).toBe(true);
  });

  it('reports nothing and refreshes nothing for a choice answered after the screen closed', async () => {
    const built = world();
    let open: () => void = () => undefined;
    built.saveGate = new Promise<void>((resolve) => {
      open = resolve;
    });
    built.saving = err({ kind: 'storage-unavailable' });

    const choosing = built.view.chooseCompute(CHOICE, 'gpu');
    await settled();
    built.view.dispose();
    open();
    await choosing;

    expect(built.notices).toEqual([]);
    expect(built.refreshed()).toEqual([]);
  });

  it('deletes once when asked twice at once', async () => {
    const built = world();

    await Promise.all([built.view.remove(CHOICE), built.view.remove(CHOICE)]);

    expect(built.deletes).toBe(1);
    expect(built.view.removal.message).toBe(`Freed 120 MB. ${REMOVAL_WARNING}`);
  });

  it('closes the confirmation and refreshes the storage once a deletion is asked', async () => {
    const built = world();
    built.view.removal.ask(true);

    await built.view.remove(CHOICE);

    expect(built.view.removal.confirming).toBe(false);
    expect(built.refreshed()).toEqual([STORAGE_KEY]);
  });

  it('refreshes the storage after a stop', async () => {
    const built = world();

    await built.view.stop(CHOICE);

    expect(built.cancels).toEqual([MODEL]);
    expect(built.refreshed()).toEqual([STORAGE_KEY]);
  });

  it('ignores a download answered after the screen closed', async () => {
    const built = world();
    const starting = built.view.start(CHOICE);
    await settled();

    built.view.dispose();
    at(built.attempts, 0).settle(ok(OPENED));
    await starting;

    expect(built.view.download.session).toBeNull();
  });

  it('saves nothing when the selected model is chosen again', async () => {
    const built = world();

    await built.view.chooseModel(CHOICE, SECOND);
    await built.view.chooseModel({ ...CHOICE, selected: SECOND }, SECOND);

    expect(built.saved).toEqual([SECOND]);
  });

  it('saves nothing when the chosen compute is chosen again', async () => {
    const built = world();

    await built.view.chooseCompute(CHOICE, 'auto');

    expect(built.saved).toEqual([]);
  });

  it('cancels the abandoned model when another model is chosen', async () => {
    const built = world();

    await built.view.chooseModel(CHOICE, SECOND);

    expect(built.cancels).toEqual([MODEL]);
    expect(built.pauses).toEqual([]);
    expect(built.closes).toEqual(['ja']);
  });

  it('drops the cached recognizer when the compute choice changes', async () => {
    const built = world();

    await built.view.chooseCompute(CHOICE, 'gpu');
    await settled();

    expect(built.pauses).toEqual(['ja']);
    expect(built.closes).toEqual(['ja']);
  });

  it('reports a compute choice that storage refused to keep', async () => {
    const built = world();
    built.saving = err({ kind: 'storage-failed', cause: 'quota' });

    await built.view.chooseCompute(CHOICE, 'gpu');

    expect(built.notices).toEqual([
      { tone: 'danger', title: SETUP_FAILED, message: 'Local storage failed: quota' },
    ]);
  });

  it('reports a model choice that storage refused to keep', async () => {
    const built = world();
    built.saving = err({ kind: 'storage-unavailable' });

    await built.view.chooseModel(CHOICE, 'another-model');

    expect(built.notices.map((notice) => [notice.tone, notice.title])).toEqual([
      ['danger', SETUP_FAILED],
    ]);
  });

  it('reports nothing when a compute choice is kept', async () => {
    const built = world();

    await built.view.chooseCompute(CHOICE, 'gpu');

    expect(built.notices).toEqual([]);
  });

  it('reports a download that failed, naming the cause', async () => {
    const built = world();

    const starting = built.view.start(CHOICE);
    await settled();
    at(built.attempts, 0).settle(err({ kind: 'unavailable', cause: 'network down' }));
    await starting;

    expect(built.view.download.state).toEqual({ kind: 'failed', cause: 'network down' });
    expect(built.notices).toEqual([
      { tone: 'danger', title: LOAD_FAILED, message: 'network down' },
    ]);
  });

  it('reports nothing for a download that opened or was cancelled', async () => {
    const built = world();

    const opening = built.view.start(CHOICE);
    await settled();
    at(built.attempts, 0).settle(ok(OPENED));
    await opening;

    const cancelling = built.view.start(CHOICE);
    await settled();
    at(built.attempts, 1).settle(err({ kind: 'cancelled' }));
    await cancelling;

    expect(built.notices).toEqual([]);
  });

  it('reports a model that could not be deleted', async () => {
    const built = world();
    built.deleting = err({ kind: 'cache-failed', cause: 'locked' });

    await built.view.remove(CHOICE);

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
    const built = world();

    await built.view.remove(CHOICE);

    expect(built.view.removal.message).toBe(`Freed 120 MB. ${REMOVAL_WARNING}`);
    expect(built.notices).toEqual([]);
  });

  it('offers a resume when the configuration is cached and the weights are not', () => {
    const engine = world().view.engine(snapshotOf([], 50_000_000, 5));

    expect(engine.stored).toBe(false);
    expect(engine.partlyDownloaded).toBe(true);
  });

  it('offers no resume once both weight files are cached', () => {
    const engine = world().view.engine(snapshotOf(REQUIRED_WEIGHTS, 0, 7));

    expect(engine.stored).toBe(true);
    expect(engine.partlyDownloaded).toBe(false);
  });

  it('offers a resume while one of the two weight files is still missing', () => {
    const engine = world().view.engine(snapshotOf([REQUIRED_WEIGHTS[0] ?? ''], 0, 6));

    expect(engine.stored).toBe(false);
    expect(engine.partlyDownloaded).toBe(true);
  });

  it('reports nothing stored before the storage is read', () => {
    const engine = world().view.engine(null);

    expect(engine.stored).toBe(false);
    expect(engine.partlyDownloaded).toBe(false);
  });

  it('reports the download in the engine state', async () => {
    const built = world();
    const starting = built.view.start(CHOICE);
    await settled();
    const opening = built.view.engine(null);
    at(built.attempts, 0).settle(err({ kind: 'unavailable', cause: 'no memory' }));
    await starting;
    const failed = built.view.engine(null);
    built.view.download.reset();
    built.view.download.session = OPENED;

    expect(opening).toMatchObject({ opening: true, load: null, failure: null });
    expect(failed).toMatchObject({ opening: false, failure: 'no memory' });
    expect(built.view.engine(null).session).toBe(OPENED);
  });

  it('records the grant for the chosen model before the download starts', async () => {
    const built = world();

    expect(built.grants).toEqual([]);

    void built.view.start(CHOICE);
    await settled();

    expect(built.grants).toEqual(['ja']);
    expect(built.attempts.length).toBe(1);
  });

  it('records the grant again for a download resumed from the settings screen', async () => {
    const built = world();

    void built.view.start(CHOICE);
    await settled();
    await built.view.pause(CHOICE);
    void built.view.start(CHOICE);
    await settled();

    expect(built.grants).toEqual(['ja', 'ja']);
  });

  it('holds a paused download paused when the abandoned load resolves afterwards', async () => {
    const built = world();

    void built.view.start(CHOICE);
    await settled();
    await built.view.pause(CHOICE);

    built.attempts[0]?.settle({ ok: false, error: { kind: 'cancelled' } });
    await settled();

    expect(built.view.download.state.kind).toBe('paused');
    expect(built.view.engine(snapshotOf([], 50_000_000, 5)).paused).toBe(true);
  });

  it('keeps a resumed download running when the first attempt resolves afterwards', async () => {
    const built = world();

    void built.view.start(CHOICE);
    await settled();
    await built.view.pause(CHOICE);

    void built.view.start(CHOICE);
    await settled();

    built.attempts[0]?.settle({ ok: false, error: { kind: 'cancelled' } });
    await settled();

    expect(built.view.download.state.kind).toBe('loading');
  });

  it('leaves a discarded download cancelled when the abandoned load resolves afterwards', async () => {
    const built = world();

    void built.view.start(CHOICE);
    await settled();
    await built.view.stop(CHOICE);

    built.attempts[0]?.settle({ ok: true, value: OPENED });
    await settled();

    expect(built.view.download.state.kind).toBe('cancelled');
    expect(built.view.download.session).toBeNull();
  });
});

describe('engineLanguages', () => {
  it('offers every language a model can read', () => {
    expect(engineLanguages()).toEqual(['ja', 'ko', 'en']);
  });
});
