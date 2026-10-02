import { describe, expect, it } from 'vitest';
import { HttpError } from '$lib/platform/http/http-error';
import { explainUnreachable, NEEDS_A_CONNECTION } from './network-reach';

type Env = { fetch: (input: string | URL, init?: unknown) => Promise<unknown> };

const CONFIG = 'https://huggingface.co/kimchireader/manga-ocr-onnx-q8/resolve/main/config.json';

function offline(): Env {
  return { fetch: () => Promise.reject(new TypeError('Failed to fetch')) };
}

function answering(): Env {
  return { fetch: (input: string | URL) => Promise.resolve(String(input)) };
}

describe('explainUnreachable', () => {
  it('names the missing connection when a load fails after a request could not reach the network', async () => {
    const watched = offline();
    const explained = explainUnreachable(watched);
    const failure = new Error('no available backend found. ERR: [wasm] TypeError: Failed to fetch');

    const loading = explained(
      watched.fetch(CONFIG).then(
        () => 'opened',
        () => Promise.reject(failure),
      ),
    );

    await expect(loading).rejects.toThrow(NEEDS_A_CONNECTION);
    await expect(loading).rejects.toHaveProperty('cause', failure);
  });

  it('rejects the request itself with what the network answered', async () => {
    const watched = offline();
    explainUnreachable(watched);

    await expect(watched.fetch(CONFIG)).rejects.toBeInstanceOf(TypeError);
  });

  it('passes a load failure through when every request reached the network', async () => {
    const watched = answering();
    const explained = explainUnreachable(watched);
    const failure = new Error('The model declares no decoder');

    await watched.fetch(CONFIG);
    await expect(explained(Promise.reject(failure))).rejects.toBe(failure);
  });

  it('passes a load failure through when a request was refused with an error status', async () => {
    const refused = new HttpError(404, 'GET', CONFIG);
    const watched: Env = { fetch: () => Promise.reject(refused) };
    const explained = explainUnreachable(watched);

    await expect(explained(watched.fetch(CONFIG))).rejects.toBe(refused);
  });

  it('resolves what the load resolves, even after a request could not reach the network', async () => {
    const watched = offline();
    const explained = explainUnreachable(watched);

    await watched.fetch(CONFIG).catch(() => undefined);
    await expect(explained(Promise.resolve('opened'))).resolves.toBe('opened');
  });

  it('passes each request through to the fetch it wrapped', async () => {
    const watched = answering();
    explainUnreachable(watched);

    await expect(watched.fetch(CONFIG)).resolves.toBe(CONFIG);
  });
});
