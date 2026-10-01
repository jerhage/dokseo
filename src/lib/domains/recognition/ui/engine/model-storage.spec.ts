import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { ModelStorageError } from '../../domain/model/model-storage';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import { ModelStorage } from './model-storage.svelte';
import { OperationClock } from './operation-clock';

const WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

type Answer = {
  readonly settle: (read: Result<ModelStorageSnapshot, ModelStorageError>) => void;
  readonly fail: (cause: unknown) => void;
};

function snapshot(
  weights: readonly string[],
  files: number,
  partialBytes = 0,
): ModelStorageSnapshot {
  return {
    report: {
      modelId: JAPANESE_OCR_MODEL.modelId,
      files,
      bytes: 400_000,
      unsized: 0,
      required: WEIGHTS,
      weights,
    },
    partial: {
      modelId: JAPANESE_OCR_MODEL.modelId,
      files: partialBytes > 0 ? 1 : 0,
      bytes: partialBytes,
    },
    usage: null,
    quota: null,
    persisted: true,
  };
}

function world(): { storage: ModelStorage; clock: OperationClock; answers: Answer[] } {
  const answers: Answer[] = [];
  const container = {
    recognition: {
      readModelStorage: () =>
        new Promise<Result<ModelStorageSnapshot, ModelStorageError>>((resolve, reject) => {
          answers.push({ settle: resolve, fail: reject });
        }),
    },
  } as unknown as Container;
  const clock = new OperationClock();
  return { storage: new ModelStorage(container, clock), clock, answers };
}

async function measured(
  held: ReturnType<typeof world>,
  answer: (each: Answer) => void,
): Promise<void> {
  const measuring = held.storage.measure(JAPANESE_OCR_MODEL, held.clock.current);
  answer(held.answers[held.answers.length - 1] as Answer);
  await measuring;
}

describe('ModelStorage', () => {
  it('holds what was read and clears the note of an earlier failure', async () => {
    const held = world();
    await measured(held, (each) => each.settle(err({ kind: 'cache-unavailable' })));

    await measured(held, (each) => each.settle(ok(snapshot(WEIGHTS, 7))));

    expect(held.storage.snapshot).toEqual(snapshot(WEIGHTS, 7));
    expect(held.storage.message).toBeNull();
  });

  it('names the cause of a read that threw', async () => {
    const held = world();

    await measured(held, (each) => each.fail(new Error('gone')));

    expect(held.storage.snapshot).toBeNull();
    expect(held.storage.message).toBe('What the model occupies could not be read: gone');
  });

  it('drops a read that answers after a newer operation began', async () => {
    const held = world();

    await measured(held, (each) => {
      held.clock.next();
      each.settle(ok(snapshot(WEIGHTS, 7)));
    });

    expect(held.storage.snapshot).toBeNull();
  });

  it('drops a throw that answers after a newer operation began', async () => {
    const held = world();

    await measured(held, (each) => {
      held.clock.next();
      each.fail(new Error('gone'));
    });

    expect(held.storage.message).toBeNull();
  });

  it('reads nothing without a model', async () => {
    const held = world();

    await held.storage.measure(null, held.clock.current);

    expect(held.answers).toEqual([]);
  });

  it('forgets what it read and its note', async () => {
    const held = world();
    await measured(held, (each) => each.settle(ok(snapshot(WEIGHTS, 7))));

    held.storage.forget();

    expect(held.storage.snapshot).toBeNull();
    expect(held.storage.message).toBeNull();
  });

  it('offers no resume for a stored model, even beside a leftover part', async () => {
    const held = world();

    await measured(held, (each) => each.settle(ok(snapshot(WEIGHTS, 7, 5_000_000))));

    expect(held.storage.stored).toBe(true);
    expect(held.storage.resumable).toBe(false);
  });

  it('offers a resume for a part-downloaded file alone', async () => {
    const held = world();

    await measured(held, (each) => each.settle(ok(snapshot([], 0, 5_000_000))));

    expect(held.storage.resumable).toBe(true);
  });
});
