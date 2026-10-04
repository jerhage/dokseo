type RootRequest =
  | {
      readonly kind: 'root';
      readonly id: number;
      readonly value: number;
      readonly delayMs: number;
    }
  | { readonly kind: 'crash' };

type RootReply =
  | { readonly kind: 'rooted'; readonly id: number; readonly root: number }
  | { readonly kind: 'failed'; readonly id: number; readonly message: string };

const ROOT_WORKER_SOURCE = `self.onmessage = (event) => {
  const request = event.data;
  if (request.kind === 'crash') {
    throw new Error('The worker read a request it has no code for');
  }
  setTimeout(() => {
    if (request.value < 0) {
      postMessage({
        kind: 'failed',
        id: request.id,
        message: 'No real square root of ' + request.value,
      });
      return;
    }
    postMessage({ kind: 'rooted', id: request.id, root: Math.sqrt(request.value) });
  }, request.delayMs);
};
`;

function rootReply(data: unknown): RootReply | null {
  if (typeof data !== 'object' || data === null) return null;
  if (!('kind' in data) || !('id' in data) || typeof data.id !== 'number') return null;
  if (data.kind === 'rooted' && 'root' in data && typeof data.root === 'number') {
    return { kind: 'rooted', id: data.id, root: data.root };
  }
  if (data.kind === 'failed' && 'message' in data && typeof data.message === 'string') {
    return { kind: 'failed', id: data.id, message: data.message };
  }
  return null;
}

export { ROOT_WORKER_SOURCE, rootReply };
export type { RootReply, RootRequest };
