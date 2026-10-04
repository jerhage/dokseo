import { describe, expect, it } from 'vitest';
import { ORDER_PROGRAM, eventLoopOrder } from './event-loop-order';

const NODE_LOOP = {
  task: (run: () => void) => {
    setTimeout(run, 0);
  },
  frame: (run: () => void) => {
    setTimeout(run, 16);
  },
};

describe('eventLoopOrder', () => {
  it('runs the synchronous lines, then every microtask, then the task and the frame', async () => {
    const entries = await eventLoopOrder(NODE_LOOP);

    expect(entries.map((entry) => entry.label)).toEqual([
      'script starts',
      'async function body',
      'script ends',
      'queueMicrotask',
      'then on a resolved promise',
      'after await',
      'setTimeout 0',
      'requestAnimationFrame',
    ]);
  });

  it('logs every line that the shown program logs, and nothing else', async () => {
    const entries = await eventLoopOrder(NODE_LOOP);
    const shown = [...ORDER_PROGRAM.matchAll(/log\('(\w+)', '([^']+)'\)/gu)].map(
      ([, queue, label]) => `${queue} ${label}`,
    );

    expect(entries.map((entry) => `${entry.queue} ${entry.label}`).toSorted()).toEqual(
      shown.toSorted(),
    );
  });
});
