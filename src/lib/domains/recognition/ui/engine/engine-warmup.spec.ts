import { describe, expect, it } from 'vitest';
import type { Container, RecognitionNotices } from '$lib/container';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import { at } from '$lib/shared/testing/at';
import { JAPANESE_OCR_MODEL, modelFootprint } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import type { ModelLoad } from '../../domain/model/model-load';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { PrepareRecognizerResult } from '../../use-cases/engine/prepare-recognizer';
import type { RecognizeRegionResult } from '../../use-cases/engine/recognize-region';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import { engineStateOf, EngineWarmup, warmthOf } from './engine-warmup.svelte';
import type { EngineWarmth, PendingRecognition } from './engine-warmup.svelte';

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

const OPENED_SESSION: RecognizerSession = {
  modelId: 'DigitalLarynx/manga-ocr-onnx',
  device: 'webgpu',
  fellBackFrom: null,
};

const STALE_SESSION: RecognizerSession = { ...OPENED_SESSION, device: 'wasm' };

const LOAD: ModelLoad = { fraction: 0.4, source: 'network', loadedBytes: 0, totalBytes: 0 };

type Reading = RecognizeRegionResult;

type Opening = PrepareRecognizerResult;

type Call = {
  readonly notices: RecognitionNotices;
  readonly settle: (reading: Reading) => void;
};

type Prepare = {
  readonly notices: RecognitionNotices;
  readonly settle: (opened: Opening) => void;
  readonly fail: (cause: unknown) => void;
};

type Setup = {
  readonly model: ModelFootprint | null;
  readonly weights: number;
  readonly partialBytes: number;
  readonly prepare: 'answers' | 'waits';
};

type Reads = 'ready' | 'loading' | 'failed';

type World = {
  readonly warmup: EngineWarmup;
  readonly calls: Call[];
  readonly prepares: Prepare[];
  readonly opens: Language[];
  readonly closes: Language[];
  readonly stored: Language[];
  readonly storageReads: string[];
  readonly bump: () => void;
  setupReads: Reads;
  storageReadsAs: Reads;
};

const STORED_SETUP: Setup = {
  model: modelFootprint('ja'),
  weights: REQUIRED_WEIGHTS.length,
  partialBytes: 0,
  prepare: 'answers',
};

function snapshot(modelId: string, weights: number, partialBytes: number): ModelStorageSnapshot {
  return {
    report: {
      modelId,
      files: weights,
      bytes: weights * 1_000,
      unsized: 0,
      required: REQUIRED_WEIGHTS,
      weights: REQUIRED_WEIGHTS.slice(0, weights),
    },
    partial: { modelId, files: partialBytes > 0 ? 1 : 0, bytes: partialBytes },
    usage: null,
    quota: null,
    persisted: false,
  };
}

function fakes(setup: Partial<Setup> = {}): World {
  const chosen = { ...STORED_SETUP, ...setup };
  const calls: Call[] = [];
  const prepares: Prepare[] = [];
  const opens: Language[] = [];
  const closes: Language[] = [];
  const stored: Language[] = [];
  const storageReads: string[] = [];
  let generation = 0;

  const container = {
    beginTrace: () => ({ step: () => undefined, image: () => undefined, end: () => undefined }),
    recognition: {
      prepareRecognizer: (language: Language, notices: RecognitionNotices = {}) => {
        opens.push(language);
        if (chosen.prepare === 'waits') {
          return new Promise<Opening>((resolve, reject) => {
            prepares.push({ notices, settle: resolve, fail: reject });
          });
        }
        notices.onSession?.(OPENED_SESSION);
        return Promise.resolve({ kind: 'success', session: OPENED_SESSION });
      },
      recognizeRegion: (
        _language: Language,
        _source: PageSource,
        _regions: unknown,
        _arrangement: unknown,
        notices: RecognitionNotices = {},
      ) =>
        new Promise<Reading>((resolve) => {
          calls.push({ notices, settle: resolve });
        }),
      closeRecognizer: (language: Language) => {
        closes.push(language);
        return Promise.resolve();
      },
    },
  } as unknown as Container;

  const world: World = {
    warmup: new EngineWarmup(
      container,
      () => {
        const answered = <T>(reads: Reads, value: T): ReadState<T> =>
          reads === 'ready' ? readReady(value) : reads === 'failed' ? readFailed('gone') : LOADING;
        return {
          chosen: answered(world.setupReads, chosen.model),
          consent: LOADING,
          get storage() {
            const modelId = chosen.model?.modelId ?? 'none';
            storageReads.push(modelId);
            return answered(world.storageReadsAs, {
              kind: 'success' as const,
              snapshot: snapshot(modelId, chosen.weights, chosen.partialBytes),
            });
          },
          reload: () => undefined,
        };
      },
      () => generation,
      { stored: (language) => stored.push(language) },
    ),
    calls,
    prepares,
    opens,
    closes,
    stored,
    storageReads,
    bump: () => {
      generation += 1;
    },
    setupReads: 'ready',
    storageReadsAs: 'ready',
  };
  return world;
}

const source = {} as PageSource;

function selection(language: Language = 'ja'): PendingRecognition {
  return {
    source,
    language,
    regions: [{ index: imageIndex(13), rect: imageRect(0, 0, 40, 20) }],
    arrangement: 'row',
  };
}

async function settled(): Promise<void> {
  for (let turn = 0; turn < 50; turn += 1) await Promise.resolve();
}

async function started(calls: readonly Call[], index: number): Promise<Call> {
  for (let tick = 0; tick < 50 && calls.length <= index; tick += 1) {
    await Promise.resolve();
  }
  return at(calls, index);
}

describe('warmthOf', () => {
  const cases: readonly (readonly [string, ModelStorageSnapshot | null, EngineWarmth])[] = [
    ['an unread storage as unchecked', null, { kind: 'unchecked' }],
    [
      'every required weight on disk as stored',
      snapshot('m', REQUIRED_WEIGHTS.length, 0),
      { kind: 'stored' },
    ],
    ['some cached weights as partial', snapshot('m', 1, 0), { kind: 'partial' }],
    ['a part-downloaded file as partial', snapshot('m', 0, 10), { kind: 'partial' }],
    ['nothing on disk as missing', snapshot('m', 0, 0), { kind: 'missing' }],
  ];

  it.each(cases)('reports %s', (_name, storage, warmth) => {
    expect(warmthOf(storage)).toEqual(warmth);
  });
});

describe('engineStateOf', () => {
  const cases: readonly (readonly [EngineWarmth, Partial<ReturnType<typeof engineStateOf>>])[] = [
    [{ kind: 'unchecked' }, {}],
    [{ kind: 'missing' }, {}],
    [{ kind: 'partial' }, { partlyDownloaded: true }],
    [{ kind: 'stored' }, { stored: true }],
    [{ kind: 'opening' }, { stored: true, opening: true }],
    [
      { kind: 'failed', cause: 'gone' },
      { stored: true, failure: 'gone' },
    ],
  ];

  it.each(cases)('maps %o to the engine state the pill reads', (warmth, fields) => {
    expect(engineStateOf(warmth, LOAD, OPENED_SESSION)).toEqual({
      stored: false,
      opening: false,
      load: LOAD,
      session: OPENED_SESSION,
      failure: null,
      paused: false,
      cancelled: false,
      partlyDownloaded: false,
      ...fields,
    });
  });
});

describe('EngineWarmup', () => {
  it('opens a stored model, joins the consent, and ends stored with its session', async () => {
    const world = fakes();

    await world.warmup.warm('ja');

    expect(world.stored).toEqual(['ja']);
    expect(world.opens).toEqual(['ja']);
    expect(world.warmup.warmth).toEqual({ kind: 'stored' });
    expect(world.warmup.session).toEqual(OPENED_SESSION);
    expect(world.warmup.engine.stored).toBe(true);
  });

  it('opens nothing and joins nothing when the weights are not on disk', async () => {
    const world = fakes({ weights: 0, partialBytes: 10 });

    await world.warmup.warm('ja');

    expect(world.stored).toEqual([]);
    expect(world.opens).toEqual([]);
    expect(world.warmup.warmth).toEqual({ kind: 'partial' });
  });

  it('reads no storage when the language has no model', async () => {
    const world = fakes({ model: null });

    await world.warmup.warm('ja');

    expect(world.storageReads).toEqual([]);
    expect(world.warmup.warmth).toEqual({ kind: 'unchecked' });
  });

  it('reports opening while the recognizer starts, with the progress it reports', async () => {
    const world = fakes({ prepare: 'waits' });

    const warming = world.warmup.warm('ja');
    await settled();
    at(world.prepares, 0).notices.onProgress?.(LOAD);

    expect(world.warmup.warmth).toEqual({ kind: 'opening' });
    expect(world.warmup.progress).toEqual(LOAD);

    at(world.prepares, 0).settle({ kind: 'success', session: OPENED_SESSION });
    await warming;

    expect(world.warmup.warmth).toEqual({ kind: 'stored' });
    expect(world.warmup.progress).toBeNull();
    expect(world.warmup.session).toEqual(OPENED_SESSION);
  });

  it('holds the cause when the recognizer is unavailable', async () => {
    const world = fakes({ prepare: 'waits' });
    const warming = world.warmup.warm('ja');
    await settled();

    at(world.prepares, 0).settle({ kind: 'unavailable', cause: 'no wasm' });
    await warming;

    expect(world.warmup.warmth).toEqual({ kind: 'failed', cause: 'no wasm' });
  });

  it('holds the cause when opening throws', async () => {
    const world = fakes({ prepare: 'waits' });
    const warming = world.warmup.warm('ja');
    await settled();

    at(world.prepares, 0).fail(new Error('the worker died'));
    await warming;

    expect(world.warmup.warmth).toEqual({ kind: 'failed', cause: 'the worker died' });
  });

  it('settles back to stored when the open is cancelled', async () => {
    const world = fakes({ prepare: 'waits' });
    const warming = world.warmup.warm('ja');
    await settled();

    at(world.prepares, 0).settle({ kind: 'cancelled' });
    await warming;

    expect(world.warmup.warmth).toEqual({ kind: 'stored' });
    expect(world.warmup.session).toBeNull();
  });

  it('ignores an open that answers after the book changed', async () => {
    const world = fakes({ prepare: 'waits' });
    const warming = world.warmup.warm('ja');
    await settled();

    world.bump();
    at(world.prepares, 0).notices.onProgress?.(LOAD);
    at(world.prepares, 0).notices.onSession?.(OPENED_SESSION);
    at(world.prepares, 0).settle({ kind: 'success', session: OPENED_SESSION });
    await warming;

    expect(world.warmup.session).toBeNull();
    expect(world.warmup.progress).toBeNull();
    expect(world.warmup.warmth).toEqual({ kind: 'opening' });
  });

  it('ignores an open that throws after the book changed', async () => {
    const world = fakes({ prepare: 'waits' });
    const warming = world.warmup.warm('ja');
    await settled();

    world.bump();
    at(world.prepares, 0).fail(new Error('the worker died'));
    await warming;

    expect(world.warmup.warmth).toEqual({ kind: 'opening' });
  });

  it('ignores an open of a language the reader has moved away from', async () => {
    const world = fakes({ prepare: 'waits' });
    const warming = world.warmup.warm('ja');
    await settled();

    const reading = world.warmup.read(selection('ko'));
    at(world.prepares, 0).notices.onSession?.(STALE_SESSION);
    at(world.prepares, 0).settle({ kind: 'success', session: STALE_SESSION });
    await warming;

    expect(world.warmup.session).toBeNull();
    expect(world.warmup.warmth).toEqual({ kind: 'unchecked' });
    (await started(world.calls, 0)).settle({ kind: 'success', text: recognizedText('한', null) });
    await reading;
  });

  it('opens a stored model once the reads settle after a warm asked too early', async () => {
    const world = fakes();
    world.storageReadsAs = 'loading';

    await world.warmup.warm('ja');
    expect(world.opens).toEqual([]);
    expect(world.warmup.warmth).toEqual({ kind: 'unchecked' });

    world.storageReadsAs = 'ready';
    await world.warmup.resume('ja');

    expect(world.opens).toEqual(['ja']);
    expect(world.stored).toEqual(['ja']);
  });

  const failedReads: readonly (readonly [string, 'setupReads' | 'storageReadsAs', number])[] = [
    ['setup', 'setupReads', 0],
    ['storage', 'storageReadsAs', 1],
  ];

  it.each(failedReads)(
    'opens nothing, and reads the storage no further, when the %s read failed',
    async (_name, read, storageReads) => {
      const world = fakes();
      world[read] = 'failed';

      await world.warmup.warm('ja');

      expect(world.storageReads).toHaveLength(storageReads);
      expect(world.opens).toEqual([]);
      expect(world.warmup.warmth).toEqual({ kind: 'unchecked' });

      await world.warmup.resume('ja');

      expect(world.storageReads).toHaveLength(storageReads);
      expect(world.opens).toEqual([]);
      expect(world.warmup.warmth).toEqual({ kind: 'unchecked' });
    },
  );

  it.each(failedReads)(
    'stops warming when the book changes before the %s is read',
    async (_name, read, storageReads) => {
      const world = fakes();
      world[read] = 'loading';
      await world.warmup.warm('ja');

      world.bump();
      world[read] = 'ready';
      await world.warmup.resume('ja');

      expect(world.storageReads).toHaveLength(storageReads);
      expect(world.warmup.warmth).toEqual({ kind: 'unchecked' });
      expect(world.opens).toEqual([]);
      expect(world.stored).toEqual([]);
    },
  );

  it('warms only the language asked last once the reads settle', async () => {
    const world = fakes();
    world.setupReads = 'loading';
    await world.warmup.warm('ja');
    await world.warmup.warm('ko');

    world.setupReads = 'ready';
    await world.warmup.resume('ja');
    await world.warmup.resume('ko');

    expect(world.opens).toEqual(['ko']);
  });

  it('holds the load progress until the last recognition in flight settles', async () => {
    const world = fakes();
    const first = world.warmup.read(selection());
    const second = world.warmup.read(selection());

    (await started(world.calls, 0)).notices.onProgress?.(LOAD);
    (await started(world.calls, 0)).settle({ kind: 'success', text: recognizedText('一', null) });
    await first;

    expect(world.warmup.progress).toEqual(LOAD);

    (await started(world.calls, 1)).settle({ kind: 'success', text: recognizedText('二', null) });
    await second;

    expect(world.warmup.progress).toBeNull();
  });

  it('keeps the progress a reading reports past the end of an open', async () => {
    const world = fakes({ prepare: 'waits' });
    const reading = world.warmup.read(selection());
    const warming = world.warmup.warm('ja');
    await settled();
    (await started(world.calls, 0)).notices.onProgress?.(LOAD);

    at(world.prepares, 0).settle({ kind: 'success', session: OPENED_SESSION });
    await warming;

    expect(world.warmup.progress).toEqual(LOAD);

    at(world.calls, 0).settle({ kind: 'success', text: recognizedText('一', null) });
    await reading;
  });

  it('takes a session a reading reports', async () => {
    const world = fakes();
    const reading = world.warmup.read(selection());

    (await started(world.calls, 0)).notices.onSession?.(OPENED_SESSION);

    expect(world.warmup.session).toEqual(OPENED_SESSION);
    at(world.calls, 0).settle({ kind: 'success', text: recognizedText('一', null) });
    await reading;
  });

  const warmings: readonly (readonly [string, Language, boolean, readonly Language[]])[] = [
    ['the same language twice', 'ja', false, ['ja']],
    ['a second language on the same book', 'ko', false, ['ja', 'ko']],
    ['the language again on the next book', 'ja', true, ['ja', 'ja']],
  ];

  it.each(warmings)(
    'warms a language once per book: %s',
    async (_name, second, nextBook, opened) => {
      const world = fakes();
      await world.warmup.warm('ja');

      if (nextBook) world.bump();
      await world.warmup.warm(second);

      expect(world.opens).toEqual(opened);
    },
  );

  it('closes the recognizer of the old language once and clears its state on a switch', async () => {
    const world = fakes();
    await world.warmup.warm('ja');

    const reading = world.warmup.read(selection('ko'));

    expect(world.closes).toEqual(['ja']);
    expect(world.warmup.session).toBeNull();
    expect(world.warmup.warmth).toEqual({ kind: 'unchecked' });

    (await started(world.calls, 0)).settle({ kind: 'success', text: recognizedText('한', null) });
    await reading;

    expect(world.closes).toEqual(['ja']);
  });

  it('closes nothing when the language stays the same', async () => {
    const world = fakes();
    await world.warmup.warm('ja');

    const reading = world.warmup.read(selection('ja'));
    (await started(world.calls, 0)).settle({ kind: 'success', text: recognizedText('一', null) });
    await reading;

    expect(world.closes).toEqual([]);
    expect(world.warmup.session).toEqual(OPENED_SESSION);
  });

  it('closes the recognizer of the old language only once its reading ends', async () => {
    const world = fakes();
    const reading = world.warmup.read(selection('ja'));
    const call = await started(world.calls, 0);

    await world.warmup.warm('ko');

    expect(world.closes).toEqual([]);

    call.settle({ kind: 'success', text: recognizedText('一', null) });
    await reading;

    expect(world.closes).toEqual(['ja']);

    const later = world.warmup.read(selection('ko'));
    (await started(world.calls, 1)).settle({ kind: 'success', text: recognizedText('한', null) });
    await later;

    expect(world.closes).toEqual(['ja']);
  });

  it('keeps a retired recognizer open when the reader comes back to its language', async () => {
    const world = fakes();
    const first = world.warmup.read(selection('ja'));
    await started(world.calls, 0);
    await world.warmup.warm('ko');

    const back = world.warmup.read(selection('ja'));
    at(world.calls, 0).settle({ kind: 'success', text: recognizedText('一', null) });
    (await started(world.calls, 1)).settle({ kind: 'success', text: recognizedText('二', null) });
    await Promise.all([first, back]);

    expect(world.closes).toEqual(['ko']);
  });

  it('ignores what a reading of a language the reader moved away from reports', async () => {
    const world = fakes();
    const reading = world.warmup.read(selection('ja'));
    const call = await started(world.calls, 0);
    await world.warmup.warm('ko');

    call.notices.onProgress?.(LOAD);
    call.notices.onSession?.(STALE_SESSION);

    expect(world.warmup.progress).toBeNull();
    expect(world.warmup.session).toEqual(OPENED_SESSION);
    call.settle({ kind: 'success', text: recognizedText('一', null) });
    await reading;
  });

  it('forgets the warmth, the session and the progress', async () => {
    const world = fakes({ prepare: 'waits' });
    const warming = world.warmup.warm('ja');
    await settled();
    at(world.prepares, 0).notices.onSession?.(OPENED_SESSION);
    at(world.prepares, 0).notices.onProgress?.(LOAD);

    world.warmup.forget();

    expect(world.warmup.warmth).toEqual({ kind: 'unchecked' });
    expect(world.warmup.session).toBeNull();
    expect(world.warmup.progress).toBeNull();
    expect(world.closes).toEqual([]);
    at(world.prepares, 0).settle({ kind: 'success', session: OPENED_SESSION });
    await warming;
  });

  it('forgets which recognizer it opened, so a later close closes nothing', async () => {
    const world = fakes();
    await world.warmup.warm('ja');

    world.warmup.forget();
    world.warmup.close();

    expect(world.closes).toEqual([]);
  });

  it('closes the recognizer it opened and forgets the session it reported', async () => {
    const world = fakes();
    await world.warmup.warm('ja');

    world.warmup.close();

    expect(world.closes).toEqual(['ja']);
    expect(world.warmup.session).toBeNull();
  });

  it('closes nothing when nothing was opened', () => {
    const world = fakes();

    world.warmup.close();

    expect(world.closes).toEqual([]);
  });
});
