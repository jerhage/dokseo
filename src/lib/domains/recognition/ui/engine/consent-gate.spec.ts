import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import { pageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notice } from '$lib/shared/notice';
import type { PageSource } from '$lib/shared/page-source';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import { at } from '$lib/shared/testing/at';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { askedWrites } from '$lib/shared/testing/unrun-write-query';
import { modelFootprint } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import {
  ConsentGate,
  RECOGNITION_OFF,
  RECOGNITION_UNSTARTED,
  TURN_ON,
} from './consent-gate.svelte';
import type { PendingRecognition } from './engine-warmup.svelte';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/unrun-write-query'));

beforeEach(() => {
  askedWrites.splice(0);
});

type World = {
  readonly gate: ConsentGate;
  readonly consentReads: Language[];
  readonly notices: Notice[];
  readonly bump: () => void;
  reads: 'ready' | 'loading' | 'failed';
  reloads: number;
};

function fakes(
  granted: readonly Language[] = [],
  model: (language: Language) => ModelFootprint | null = modelFootprint,
): World {
  const consentReads: Language[] = [];
  const notices: Notice[] = [];
  const agreed = new Set(granted);
  let generation = 0;

  const container = {
    beginTrace: () => ({ step: () => undefined, image: () => undefined, end: () => undefined }),
    recognition: {},
  } as unknown as Container;

  const world: World = {
    gate: new ConsentGate(
      container,
      (notice) => notices.push(notice),
      createTestQueryClient(),
      () => generation,
      (language) => {
        const answered = <T>(value: T): ReadState<T> =>
          world.reads === 'ready'
            ? readReady(value)
            : world.reads === 'failed'
              ? readFailed('The engine choice could not be read: gone')
              : LOADING;
        return {
          chosen: answered(model(language)),
          get consent() {
            consentReads.push(language);
            return answered({
              kind: 'success' as const,
              decision: agreed.has(language) ? ('granted' as const) : ('undecided' as const),
            });
          },
          storage: LOADING,
          reload: () => {
            world.reloads += 1;
          },
        };
      },
    ),
    consentReads,
    notices,
    bump: () => {
      generation += 1;
    },
    reads: 'ready',
    reloads: 0,
  };
  return world;
}

const source = {} as PageSource;

function regions(): readonly ImageRegion[] {
  return [{ index: imageIndex(13), rect: pageRect(0, 0, 0.04, 0.02) }];
}

function selection(language: Language = 'ja'): PendingRecognition {
  return { source, language, regions: regions(), arrangement: 'row' };
}

describe('ConsentGate', () => {
  it('refuses a selection it has no agreement for and holds it for the dialog', () => {
    const world = fakes();

    const admitted = world.gate.admits(selection());

    expect(admitted).toBe(false);
    expect(world.gate.request).toEqual({ language: 'ja', footprint: modelFootprint('ja') });
  });

  it('refuses a selection with no regions without asking', () => {
    const world = fakes();

    const admitted = world.gate.admits({ ...selection(), regions: [] });

    expect(admitted).toBe(false);
    expect(world.gate.request).toBeNull();
  });

  it('admits a selection whose consent is stored, and consults it once', () => {
    const world = fakes(['ja']);

    expect(world.gate.admits(selection())).toBe(true);
    expect(world.gate.admits(selection())).toBe(true);

    expect(world.consentReads).toEqual(['ja']);
    expect(world.gate.request).toBeNull();
  });

  it('admits a selection when the language has no model to download', () => {
    const world = fakes([], () => null);

    expect(world.gate.admits(selection())).toBe(true);
    expect(world.consentReads).toEqual([]);
  });

  it('admits a language taken as agreed without asking the store', () => {
    const world = fakes();

    world.gate.takeAsAgreed('ja');

    expect(world.gate.admits(selection())).toBe(true);
    expect(world.consentReads).toEqual([]);
  });

  it('hands back the held selection once the reader agrees, and stores the grant', async () => {
    const world = fakes();
    const held = selection();
    world.gate.admits(held);

    const released = await world.gate.agree();

    expect(released).toBe(held);
    expect(world.gate.request).toBeNull();
    expect(askedWrites).toEqual(['ja']);
    expect(world.gate.admits(selection())).toBe(true);
    expect(world.consentReads).toEqual(['ja']);
  });

  it('declines nothing when no selection is held', () => {
    const world = fakes();

    world.gate.decline();

    expect(world.gate.admits(selection())).toBe(false);
    expect(world.gate.request?.language).toBe('ja');
  });

  it('hands back nothing and refuses a second selection after the reader declines', async () => {
    const world = fakes();
    world.gate.admits(selection());

    world.gate.decline();

    expect(world.gate.request).toBeNull();
    expect(await world.gate.agree()).toBeNull();
    expect(world.gate.admits(selection())).toBe(false);
    expect(world.gate.request).toBeNull();
  });

  it('says recognition is off once for a selection after the reader declines, and nothing before', () => {
    const world = fakes();
    world.gate.admits(selection());
    expect(world.notices).toEqual([]);

    world.gate.decline();
    world.gate.admits(selection());
    world.gate.admits(selection());

    expect(world.notices).toEqual([
      {
        tone: 'info',
        title: RECOGNITION_OFF,
        message: 'You chose not to download the recognition model.',
        action: { label: TURN_ON, run: expect.any(Function) },
        duration: ACTION_NOTICE_MS,
      },
    ]);
  });

  it('asks again with the latest selection when the reader turns recognition on', async () => {
    const world = fakes();
    world.gate.admits(selection());
    world.gate.decline();
    const later = selection();
    world.gate.admits(later);

    at(world.notices, 0).action?.run();

    expect(world.gate.request?.language).toBe('ja');
    expect(await world.gate.agree()).toBe(later);
    expect(askedWrites).toEqual(['ja']);
  });

  it('asks nothing new when Turn on is pressed while the dialog is open', async () => {
    const world = fakes();
    world.gate.admits(selection('ko'));
    world.gate.decline();
    world.gate.admits(selection('ko'));
    const asked = selection();
    world.gate.admits(asked);

    at(world.notices, 0).action?.run();

    expect(world.gate.request?.language).toBe('ja');
    expect(await world.gate.agree()).toBe(asked);
  });

  it('tells the reader again only after a second decline', () => {
    const world = fakes();
    world.gate.admits(selection());
    world.gate.decline();
    world.gate.admits(selection());
    at(world.notices, 0).action?.run();
    world.gate.decline();

    world.gate.admits(selection());
    world.gate.admits(selection());

    expect(world.notices.map((notice) => notice.title)).toEqual([RECOGNITION_OFF, RECOGNITION_OFF]);
  });

  it('asks nothing when Turn on is pressed after the reader moved to another book', () => {
    const world = fakes();
    world.gate.admits(selection());
    world.gate.decline();
    world.gate.admits(selection());

    world.bump();
    at(world.notices, 0).action?.run();

    expect(world.gate.request).toBeNull();
  });

  it('holds a selection asked before the engine reads settle, and hands it back once they do', () => {
    const world = fakes(['ja']);
    world.reads = 'loading';
    const held = selection();

    expect(world.gate.admits(held)).toBe(false);
    expect(world.gate.request).toBeNull();

    expect(world.gate.resume('ja')).toBe(held);
    expect(world.gate.resume('ja')).toBeNull();
  });

  it('hands back no held selection for another language', () => {
    const world = fakes(['ja']);
    world.reads = 'loading';
    world.gate.admits(selection());

    expect(world.gate.resume('ko')).toBeNull();
    expect(world.gate.resume('ja')).not.toBeNull();
  });

  it('hands back no held selection once the reader moved to another book', () => {
    const world = fakes(['ja']);
    world.reads = 'loading';
    world.gate.admits(selection());

    world.bump();

    expect(world.gate.resume('ja')).toBeNull();
  });

  it('refuses a selection whose engine reads failed, tells the reader, and reads them again', () => {
    const world = fakes(['ja']);
    world.reads = 'failed';

    expect(world.gate.admits(selection())).toBe(false);

    expect(world.gate.request).toBeNull();
    expect(world.notices).toEqual([
      {
        tone: 'danger',
        title: RECOGNITION_UNSTARTED,
        message: 'The engine choice could not be read: gone',
      },
    ]);
    expect(world.reloads).toBe(1);
    expect(world.gate.resume('ja')).toBeNull();
  });

  it('forgets the held selection and the request', async () => {
    const world = fakes();
    const held = selection();
    world.gate.admits(held);

    expect(world.gate.forget()).toBe(held);

    expect(world.gate.request).toBeNull();
    expect(await world.gate.agree()).toBeNull();
    expect(askedWrites).toEqual([]);
  });
});
