import { describe, expect, it } from 'vitest';
import { animationsSettled } from './animations';
import type { Animated, Settling } from './animations';

type Pending = {
  readonly animation: Settling;
  readonly finish: () => void;
  readonly cancel: () => void;
};

function pending(iterations = 1): Pending {
  let finish = (): void => {};
  let cancel = (): void => {};
  const finished = new Promise<void>((resolve, reject) => {
    finish = resolve;
    cancel = () => reject(new DOMException('cancelled', 'AbortError'));
  });
  finished.catch(() => {});
  const animation = { finished, effect: { getComputedTiming: () => ({ iterations }) } };
  return { animation, finish, cancel };
}

function element(...animations: readonly Settling[]): Animated {
  return { getAnimations: () => animations };
}

async function settledYet(promise: Promise<void>): Promise<boolean> {
  let settled = false;
  void promise.then(() => {
    settled = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  return settled;
}

describe('animationsSettled', () => {
  it('settles at once when nothing animates', async () => {
    expect(await settledYet(animationsSettled([element()]))).toBe(true);
  });

  it('waits for an animation that is still running', async () => {
    const leaving = pending();

    expect(await settledYet(animationsSettled([element(leaving.animation)]))).toBe(false);
  });

  it('settles once every animation on every element has finished', async () => {
    const backdrop = pending();
    const panel = pending();
    const settled = animationsSettled([element(backdrop.animation), element(panel.animation)]);

    backdrop.finish();
    const halfway = await settledYet(settled);
    panel.finish();

    expect([halfway, await settledYet(settled)]).toEqual([false, true]);
  });

  it('settles when an animation is cancelled rather than finished', async () => {
    const leaving = pending();
    const settled = animationsSettled([element(leaving.animation)]);

    leaving.cancel();

    expect(await settledYet(settled)).toBe(true);
  });

  it('ignores an animation that repeats forever', async () => {
    const spinner = pending(Infinity);

    expect(await settledYet(animationsSettled([element(spinner.animation)]))).toBe(true);
  });
});
