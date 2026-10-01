import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import type { Notice } from '$lib/shared/notice';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import type { ModelStorageError } from '../../domain/model/model-storage';
import { ModelRemoval, REMOVAL_WARNING, REMOVE_FAILED } from './model-removal.svelte';
import { OperationClock } from './operation-clock';

const MODEL = JAPANESE_OCR_MODEL.modelId;

const FREED: ModelStorageReport = {
  modelId: MODEL,
  files: 7,
  bytes: 120_000_000,
  unsized: 0,
  required: [],
  weights: [],
};

type World = {
  readonly removal: ModelRemoval;
  readonly clock: OperationClock;
  readonly deletes: {
    readonly settle: (removed: Result<ModelStorageReport, ModelStorageError>) => void;
    readonly fail: (cause: unknown) => void;
  }[];
  readonly notices: Notice[];
  settles: number;
  stored: boolean;
};

function world(): World {
  const deletes: World['deletes'] = [];
  const notices: Notice[] = [];
  const container = {
    recognition: {
      cancelModelLoad: () => Promise.resolve(null),
      deleteModel: () =>
        new Promise<Result<ModelStorageReport, ModelStorageError>>((resolve, reject) => {
          deletes.push({ settle: resolve, fail: reject });
        }),
    },
  } as unknown as Container;
  const clock = new OperationClock();
  const held: World = {
    removal: new ModelRemoval(container, (notice) => notices.push(notice), clock, {
      stored: () => held.stored,
      settled: () => {
        held.settles += 1;
      },
    }),
    clock,
    deletes,
    notices,
    settles: 0,
    stored: true,
  };
  return held;
}

async function settled(): Promise<void> {
  for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
}

describe('ModelRemoval', () => {
  it('asks for a confirmation only when the model is stored', () => {
    const held = world();
    held.stored = false;
    held.removal.ask();
    const unstored = held.removal.confirming;
    held.stored = true;

    held.removal.ask();

    expect(unstored).toBe(false);
    expect(held.removal.confirming).toBe(true);
  });

  it('says what a deletion freed and settles the download', async () => {
    const held = world();
    const removing = held.removal.remove('ja', MODEL, held.clock.next());
    await settled();

    held.deletes[0]?.settle(ok(FREED));
    await removing;

    expect(held.removal.message).toBe(`Freed 120 MB. ${REMOVAL_WARNING}`);
    expect(held.settles).toBe(1);
    expect(held.removal.removing).toBe(false);
  });

  it('clears an earlier message while it deletes', async () => {
    const held = world();
    held.removal.message = 'Freed 1 MB.';

    void held.removal.remove('ja', MODEL, held.clock.next());

    expect(held.removal.message).toBeNull();
    expect(held.removal.removing).toBe(true);
  });

  it('changes nothing for a deletion that answers after a newer operation began', async () => {
    const held = world();
    const removing = held.removal.remove('ja', MODEL, held.clock.next());
    await settled();

    held.clock.next();
    held.deletes[0]?.settle(ok(FREED));
    await removing;

    expect(held.removal.message).toBeNull();
    expect(held.settles).toBe(0);
    expect(held.removal.removing).toBe(true);
  });

  it('reports a deletion that threw, naming the cause', async () => {
    const held = world();
    const removing = held.removal.remove('ja', MODEL, held.clock.next());
    await settled();

    held.deletes[0]?.fail(new Error('locked'));
    await removing;

    expect(held.notices).toEqual([{ tone: 'danger', title: REMOVE_FAILED, message: 'locked' }]);
  });

  it('reports nothing for a throw that answers after a newer operation began', async () => {
    const held = world();
    const removing = held.removal.remove('ja', MODEL, held.clock.next());
    await settled();

    held.clock.next();
    held.deletes[0]?.fail(new Error('locked'));
    await removing;

    expect(held.notices).toEqual([]);
  });

  it('forgets its message and its confirmation', () => {
    const held = world();
    held.removal.ask();
    held.removal.message = 'Freed 1 MB.';

    held.removal.forget();

    expect(held.removal.confirming).toBe(false);
    expect(held.removal.message).toBeNull();
  });
});
