import { describe, expect, it } from 'vitest';
import { SaveDesk } from './double-submit';
import type { PressOutcome, SubmitHandling } from './double-submit';

function harness(handling: SubmitHandling) {
  const finishes: (() => void)[] = [];
  const presses: PressOutcome[] = [];
  const desk = new SaveDesk(
    handling,
    () =>
      new Promise<void>((resolve) => {
        finishes.push(resolve);
      }),
    {
      changed: () => undefined,
      pressed: (outcome) => presses.push(outcome),
      saved: () => undefined,
    },
  );
  return { desk, finishes, presses };
}

async function pressTwiceDuringOneSave(handling: SubmitHandling) {
  const world = harness(handling);
  const first = world.desk.press();
  const second = world.desk.press();
  for (const finish of world.finishes) finish();
  await Promise.all([first, second]);
  return world;
}

describe('SaveDesk', () => {
  it('writes twice when nothing handles the second press', async () => {
    const world = await pressTwiceDuringOneSave('naive');

    expect(world.desk.written).toBe(2);
  });

  it('writes twice when only the button is disabled and both presses reach the handler', async () => {
    const world = await pressTwiceDuringOneSave('disable');

    expect(world.desk.written).toBe(2);
  });

  it('ignores a press that arrives while a save runs', async () => {
    const world = await pressTwiceDuringOneSave('ignore');

    expect(world.desk.written).toBe(1);
    expect(world.presses).toEqual([{ kind: 'started', save: 1 }, { kind: 'ignored' }]);
  });

  it('reports disabled only for the disable handling, and only while a save runs', async () => {
    const world = harness('disable');
    expect(world.desk.disabled).toBe(false);
    const pressing = world.desk.press();
    expect(world.desk.disabled).toBe(true);
    world.finishes[0]?.();
    await pressing;

    expect(world.desk.disabled).toBe(false);
    expect(harness('ignore').desk.disabled).toBe(false);
  });

  it('ends busy when a save rejects', async () => {
    const desk = new SaveDesk('ignore', () => Promise.reject(new Error('full')), {
      changed: () => undefined,
      pressed: () => undefined,
      saved: () => undefined,
    });

    await expect(desk.press()).rejects.toThrow('full');
    expect(desk.busy).toBe(false);
  });
});
