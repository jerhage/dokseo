type LoopQueue = 'sync' | 'microtask' | 'task' | 'frame';

type LoopEntry = {
  readonly queue: LoopQueue;
  readonly label: string;
};

type LoopScheduler = {
  readonly task: (run: () => void) => void;
  readonly frame: (run: () => void) => void;
};

const ORDER_PROGRAM = `log('sync', 'script starts');
setTimeout(() => log('task', 'setTimeout 0'), 0);
requestAnimationFrame(() => log('frame', 'requestAnimationFrame'));
queueMicrotask(() => log('microtask', 'queueMicrotask'));
Promise.resolve().then(() => log('microtask', 'then on a resolved promise'));
(async () => {
  log('sync', 'async function body');
  await Promise.resolve();
  log('microtask', 'after await');
})();
log('sync', 'script ends');`;

const ORDER_ENTRIES = 8;

function eventLoopOrder(scheduler: LoopScheduler): Promise<readonly LoopEntry[]> {
  const entries: LoopEntry[] = [];
  return new Promise((resolve) => {
    const log = (queue: LoopQueue, label: string) => {
      entries.push({ queue, label });
      if (entries.length === ORDER_ENTRIES) resolve(entries);
    };
    log('sync', 'script starts');
    scheduler.task(() => log('task', 'setTimeout 0'));
    scheduler.frame(() => log('frame', 'requestAnimationFrame'));
    queueMicrotask(() => log('microtask', 'queueMicrotask'));
    void Promise.resolve().then(() => log('microtask', 'then on a resolved promise'));
    void (async () => {
      log('sync', 'async function body');
      await Promise.resolve();
      log('microtask', 'after await');
    })();
    log('sync', 'script ends');
  });
}

export { ORDER_PROGRAM, eventLoopOrder };
export type { LoopEntry, LoopQueue, LoopScheduler };
