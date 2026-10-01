import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import type { Language } from '$lib/shared/language';
import { LOADING } from '$lib/shared/read-state';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import type { GpuDetection } from '../../domain/engine/compute-choice';
import { setupChoice } from '../../domain/engine/recognizer-setup';
import type { RecognizerChoice, SetupError } from '../../domain/engine/recognizer-setup';
import { modelsFor } from '../../domain/model/model-footprint';
import { EngineSetup, offeredModels, setupReadNote, shownModel } from './engine-setup.svelte';
import type { EngineChoice, OfferedModels } from './engine-setup.svelte';

const DETECTED: GpuDetection = { available: true, description: 'Test GPU' };

const JAPANESE = modelsFor('ja');

const SECOND = at(JAPANESE, 1);

type Read = {
  readonly language: Language;
  readonly settle: (choice: Result<RecognizerChoice, SetupError>) => void;
  readonly fail: (cause: unknown) => void;
};

type World = {
  readonly setup: EngineSetup;
  readonly reads: Read[];
  generation: number;
};

function world(): World {
  const reads: Read[] = [];
  const container = {
    recognition: {
      readRecognizerSetup: (language: Language) =>
        new Promise<Result<RecognizerChoice, SetupError>>((resolve, reject) => {
          reads.push({ language, settle: resolve, fail: reject });
        }),
      detectCompute: () => Promise.resolve(DETECTED),
    },
  } as unknown as Container;
  const held: World = {
    setup: new EngineSetup(container, () => held.generation),
    reads,
    generation: 1,
  };
  return held;
}

async function settled(): Promise<void> {
  for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
}

function choiceOf(over: Partial<EngineChoice> = {}): EngineChoice {
  return {
    language: 'ja',
    models: offeredModels('ja') as OfferedModels,
    selected: null,
    compute: 'auto',
    detection: DETECTED,
    ...over,
  };
}

describe('EngineSetup', () => {
  it('reads the first language a model reads while nothing was asked', async () => {
    const held = world();

    const loading = held.setup.load(1);
    const during = held.setup.state;
    at(held.reads, 0).settle(
      ok(setupChoice('ja', { language: 'ja', modelId: SECOND.modelId, compute: 'gpu' })),
    );
    await loading;

    expect(during).toEqual(LOADING);
    expect(at(held.reads, 0).language).toBe('ja');
    expect(held.setup.choice).toEqual({
      language: 'ja',
      models: JAPANESE,
      selected: SECOND.modelId,
      compute: 'gpu',
      detection: DETECTED,
    });
    expect(held.setup.model).toBe(SECOND);
  });

  it('reads the language it was asked for', async () => {
    const held = world();
    held.setup.language = 'ko';

    void held.setup.load(1);
    await settled();

    expect(at(held.reads, 0).language).toBe('ko');
  });

  it('fails with the cause when the read throws, and offers no model', async () => {
    const held = world();

    const loading = held.setup.load(1);
    at(held.reads, 0).fail(new Error('blocked'));
    await loading;

    expect(held.setup.state).toEqual({ kind: 'failed', message: 'blocked' });
    expect(held.setup.model).toBeNull();
  });

  it('fails with a note when storage refuses the read', async () => {
    const held = world();

    const loading = held.setup.load(1);
    at(held.reads, 0).settle(err({ kind: 'storage-failed', cause: 'locked' }));
    await loading;

    expect(held.setup.state).toEqual({ kind: 'failed', message: 'Local storage failed: locked' });
  });

  it('reads again after a failure', async () => {
    const held = world();
    const failing = held.setup.load(1);
    at(held.reads, 0).fail(new Error('blocked'));
    await failing;

    const retrying = held.setup.load(1);
    const during = held.setup.state;
    at(held.reads, 1).settle(ok(setupChoice('ja', null)));
    await retrying;

    expect(during).toEqual(LOADING);
    expect(held.setup.state.kind).toBe('ready');
  });

  it('discards a read that answers after a newer operation began', async () => {
    const held = world();

    const loading = held.setup.load(1);
    held.generation = 2;
    at(held.reads, 0).settle(ok(setupChoice('ja', null)));
    await loading;

    expect(held.setup.state).toEqual(LOADING);
  });

  it('discards a throw that answers after a newer operation began', async () => {
    const held = world();

    const loading = held.setup.load(1);
    held.generation = 2;
    at(held.reads, 0).fail(new Error('blocked'));
    await loading;

    expect(held.setup.state).toEqual(LOADING);
  });

  it('records a chosen model and compute on the read choice', async () => {
    const held = world();
    const loading = held.setup.load(1);
    at(held.reads, 0).settle(ok(setupChoice('ja', null)));
    await loading;

    held.setup.select(SECOND.modelId);
    held.setup.setCompute('gpu');

    expect(held.setup.choice?.selected).toBe(SECOND.modelId);
    expect(held.setup.choice?.compute).toBe('gpu');
  });

  it('records no choice while the setup is read', () => {
    const held = world();
    void held.setup.load(1);

    held.setup.select(SECOND.modelId);
    held.setup.setCompute('cpu');

    expect(held.setup.state).toEqual(LOADING);
  });
});

describe('shownModel', () => {
  it('shows the selected model', () => {
    expect(shownModel(choiceOf({ selected: SECOND.modelId }))).toBe(SECOND);
  });

  it('shows the first model when none or an unknown one is selected', () => {
    expect(shownModel(choiceOf())).toBe(at(JAPANESE, 0));
    expect(shownModel(choiceOf({ selected: 'gone' }))).toBe(at(JAPANESE, 0));
  });
});

describe('offeredModels', () => {
  it('offers every model that reads the language', () => {
    expect(offeredModels('ja')).toEqual(JAPANESE);
  });
});

describe('setupReadNote', () => {
  it('says the browser blocks storage', () => {
    expect(setupReadNote({ kind: 'storage-unavailable' })).toContain('blocks local storage');
  });

  it('names the cause of a failed read', () => {
    expect(setupReadNote({ kind: 'storage-failed', cause: 'locked' })).toBe(
      'Local storage failed: locked',
    );
  });
});
