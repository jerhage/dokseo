import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notice } from '$lib/shared/notice';
import type { PageSource } from '$lib/shared/page-source';
import { ok } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { modelFootprint } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import { ConsentGate, RECOGNITION_OFF, TURN_ON } from './consent-gate.svelte';
import type { PendingRecognition } from './engine-warmup.svelte';

type World = {
  readonly gate: ConsentGate;
  readonly grants: Language[];
  readonly consentReads: Language[];
  readonly notices: Notice[];
  readonly bump: () => void;
};

function fakes(
  granted: readonly Language[] = [],
  model: (language: Language) => ModelFootprint | null = modelFootprint,
): World {
  const grants: Language[] = [];
  const consentReads: Language[] = [];
  const notices: Notice[] = [];
  const agreed = new Set(granted);
  let generation = 0;

  const container = {
    beginTrace: () => ({ step: () => undefined, image: () => undefined, end: () => undefined }),
    recognition: {
      readRecognizerSetup: (language: Language) =>
        Promise.resolve(ok({ model: model(language), compute: 'auto' })),
      readModelConsent: (language: Language) => {
        consentReads.push(language);
        return Promise.resolve(ok(agreed.has(language) ? 'granted' : 'undecided'));
      },
      grantModelConsent: (language: Language) => {
        grants.push(language);
        agreed.add(language);
        return Promise.resolve(ok(undefined));
      },
    },
  } as unknown as Container;

  const gate = new ConsentGate(
    container,
    (notice) => notices.push(notice),
    () => generation,
  );
  return {
    gate,
    grants,
    consentReads,
    notices,
    bump: () => {
      generation += 1;
    },
  };
}

const source = {} as PageSource;

function regions(): readonly ImageRegion[] {
  return [{ index: imageIndex(13), rect: imageRect(0, 0, 40, 20) }];
}

function selection(language: Language = 'ja'): PendingRecognition {
  return { source, language, regions: regions(), arrangement: 'row' };
}

describe('ConsentGate', () => {
  it('refuses a selection it has no agreement for and holds it for the dialog', async () => {
    const world = fakes();

    const admitted = await world.gate.admits(selection());

    expect(admitted).toBe(false);
    expect(world.gate.request).toEqual({ language: 'ja', footprint: modelFootprint('ja') });
  });

  it('refuses a selection with no regions without asking', async () => {
    const world = fakes();

    const admitted = await world.gate.admits({ ...selection(), regions: [] });

    expect(admitted).toBe(false);
    expect(world.gate.request).toBeNull();
  });

  it('admits a selection whose consent is stored, and asks the store once', async () => {
    const world = fakes(['ja']);

    expect(await world.gate.admits(selection())).toBe(true);
    expect(await world.gate.admits(selection())).toBe(true);

    expect(world.consentReads).toEqual(['ja']);
    expect(world.gate.request).toBeNull();
  });

  it('admits a selection when the language has no model to download', async () => {
    const world = fakes([], () => null);

    expect(await world.gate.admits(selection())).toBe(true);
    expect(world.consentReads).toEqual([]);
  });

  it('admits a language taken as agreed without asking the store', async () => {
    const world = fakes();

    world.gate.takeAsAgreed('ja');

    expect(await world.gate.admits(selection())).toBe(true);
    expect(world.consentReads).toEqual([]);
  });

  it('hands back the held selection once the reader agrees, and stores the grant', async () => {
    const world = fakes();
    const held = selection();
    await world.gate.admits(held);

    const released = await world.gate.agree();

    expect(released).toBe(held);
    expect(world.gate.request).toBeNull();
    expect(world.grants).toEqual(['ja']);
    expect(await world.gate.admits(selection())).toBe(true);
    expect(world.consentReads).toEqual(['ja']);
  });

  it('declines nothing when no selection is held', async () => {
    const world = fakes();

    world.gate.decline();

    expect(await world.gate.admits(selection())).toBe(false);
    expect(world.gate.request?.language).toBe('ja');
  });

  it('hands back nothing and refuses a second selection after the reader declines', async () => {
    const world = fakes();
    await world.gate.admits(selection());

    world.gate.decline();

    expect(world.gate.request).toBeNull();
    expect(await world.gate.agree()).toBeNull();
    expect(await world.gate.admits(selection())).toBe(false);
    expect(world.gate.request).toBeNull();
  });

  it('says recognition is off once for a selection after the reader declines, and nothing before', async () => {
    const world = fakes();
    await world.gate.admits(selection());
    expect(world.notices).toEqual([]);

    world.gate.decline();
    await world.gate.admits(selection());
    await world.gate.admits(selection());

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
    await world.gate.admits(selection());
    world.gate.decline();
    const later = selection();
    await world.gate.admits(later);

    at(world.notices, 0).action?.run();

    expect(world.gate.request?.language).toBe('ja');
    expect(await world.gate.agree()).toBe(later);
    expect(world.grants).toEqual(['ja']);
  });

  it('asks nothing new when Turn on is pressed while the dialog is open', async () => {
    const world = fakes();
    await world.gate.admits(selection('ko'));
    world.gate.decline();
    await world.gate.admits(selection('ko'));
    const asked = selection();
    await world.gate.admits(asked);

    at(world.notices, 0).action?.run();

    expect(world.gate.request?.language).toBe('ja');
    expect(await world.gate.agree()).toBe(asked);
  });

  it('tells the reader again only after a second decline', async () => {
    const world = fakes();
    await world.gate.admits(selection());
    world.gate.decline();
    await world.gate.admits(selection());
    at(world.notices, 0).action?.run();
    world.gate.decline();

    await world.gate.admits(selection());
    await world.gate.admits(selection());

    expect(world.notices.map((notice) => notice.title)).toEqual([RECOGNITION_OFF, RECOGNITION_OFF]);
  });

  it('asks nothing when Turn on is pressed after the reader moved to another book', async () => {
    const world = fakes();
    await world.gate.admits(selection());
    world.gate.decline();
    await world.gate.admits(selection());

    world.bump();
    at(world.notices, 0).action?.run();

    expect(world.gate.request).toBeNull();
  });

  it('forgets the held selection and the request', async () => {
    const world = fakes();
    const held = selection();
    await world.gate.admits(held);

    expect(world.gate.forget()).toBe(held);

    expect(world.gate.request).toBeNull();
    expect(await world.gate.agree()).toBeNull();
    expect(world.grants).toEqual([]);
  });
});
