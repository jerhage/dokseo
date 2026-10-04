const AWAIT_GAP = `let query = 'ha';

async function search(): Promise<void> {
  const asked = query;
  const results = await fetchResults(asked);
  render(results);
}`;

const REQUEST_ID = `let latest = 0;

async function search(query: string): Promise<void> {
  latest += 1;
  const id = latest;
  const results = await fetchResults(query);
  if (id !== latest) return;
  render(results);
}`;

const ABORT_EARLIER = `let current: AbortController | null = null;

async function search(query: string): Promise<void> {
  current?.abort();
  const controller = new AbortController();
  current = controller;
  try {
    const response = await fetch(\`/search?q=\${encodeURIComponent(query)}\`, {
      signal: controller.signal,
    });
    render(await response.json());
  } catch (error) {
    if (controller.signal.aborted) return;
    throw error;
  }
}`;

const SIGNAL_CONSUMERS = `const controller = new AbortController();
const { signal } = controller;

fetch(url, { signal });
window.addEventListener('resize', onResize, { signal });

const timer = setTimeout(onTimeout, 5000);
signal.addEventListener('abort', () => clearTimeout(timer), { once: true });

controller.abort();`;

const SIGNAL_HELPERS = `const response = await fetch(url, {
  signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
});`;

const EVENT_PROMISE = `function loaded(frame: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    frame.addEventListener('load', () => resolve(), { once: true });
  });
}`;

const WITH_TIMEOUT = `function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(\`No answer after \${ms} ms\`)), ms);
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
}`;

const LIMITED = `async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  const queue = items.entries();
  async function worker(): Promise<void> {
    for (const [index, item] of queue) results[index] = await run(item);
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}`;

const MISSING_AWAIT = `async function onSave(): Promise<void> {
  try {
    save(draft);
  } catch (error) {
    showError(error);
  }
}`;

const FINALLY_SPINNER = `async function onSave(): Promise<void> {
  spinner.show();
  try {
    await save(draft);
  } finally {
    spinner.hide();
  }
}`;

const NEXT_FRAME = `function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}`;

export {
  ABORT_EARLIER,
  AWAIT_GAP,
  EVENT_PROMISE,
  FINALLY_SPINNER,
  LIMITED,
  MISSING_AWAIT,
  NEXT_FRAME,
  REQUEST_ID,
  SIGNAL_CONSUMERS,
  SIGNAL_HELPERS,
  WITH_TIMEOUT,
};
