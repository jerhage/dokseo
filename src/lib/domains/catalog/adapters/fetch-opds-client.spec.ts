import { describe, expect, it } from 'vitest';
import type { CatalogCredentials } from '../domain/opds-client';
import type { Acquisition } from '../domain/remote-publication';
import { FetchOpdsClient } from './fetch-opds-client';
import type { FetchFunction } from './fetch-opds-client';

const NONE: CatalogCredentials = { kind: 'none' };
const URL_OF_FEED = 'https://books.example/opds';

const ACQUISITION: Acquisition = {
  href: 'https://books.example/get/1',
  format: 'epub',
  mediaType: 'application/epub+zip',
  length: null,
};

type Recorded = { readonly url: string; readonly init: RequestInit };

function clientAnswering(answer: () => Promise<Response>, onLine = true) {
  const requests: Recorded[] = [];
  const fetchFunction: FetchFunction = (url, init) => {
    requests.push({ url, init });
    return answer();
  };
  return { client: new FetchOpdsClient(fetchFunction, () => onLine), requests };
}

function respond(response: Response) {
  return clientAnswering(() => Promise.resolve(response));
}

function streamOf(chunks: readonly Uint8Array[]): ReadableStream<Uint8Array> {
  let next = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[next];
      next += 1;
      if (chunk === undefined) controller.close();
      else controller.enqueue(chunk);
    },
  });
}

function bytes(length: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(length).fill(7);
}

describe('FetchOpdsClient.readFeed', () => {
  it('answers the text of a successful response and omits cookies', async () => {
    const { client, requests } = respond(new Response('<feed/>'));

    expect(await client.readFeed(URL_OF_FEED, NONE)).toEqual({ kind: 'success', text: '<feed/>' });
    expect(requests[0]?.url).toBe(URL_OF_FEED);
    expect(requests[0]?.init.credentials).toBe('omit');
  });

  it('sends no Authorization header for a catalog without credentials', async () => {
    const { client, requests } = respond(new Response('x'));

    await client.readFeed(URL_OF_FEED, NONE);

    expect(new Headers(requests[0]?.init.headers).has('Authorization')).toBe(false);
  });

  it('sends Basic credentials with a non-ASCII password encoded as UTF-8', async () => {
    const { client, requests } = respond(new Response('x'));

    await client.readFeed(URL_OF_FEED, { kind: 'basic', username: 'jo', password: 'pä' });

    const expected = Buffer.from('jo:pä', 'utf8').toString('base64');
    expect(new Headers(requests[0]?.init.headers).get('Authorization')).toBe(`Basic ${expected}`);
  });

  it.each([401, 403])('answers unauthorized for %i', async (status) => {
    const { client } = respond(new Response('', { status }));

    expect(await client.readFeed(URL_OF_FEED, NONE)).toEqual({ kind: 'unauthorized' });
  });

  it('answers not-found for 404', async () => {
    const { client } = respond(new Response('', { status: 404 }));

    expect(await client.readFeed(URL_OF_FEED, NONE)).toEqual({ kind: 'not-found' });
  });

  it('answers server-error with the status for any other failure', async () => {
    const { client } = respond(new Response('', { status: 500 }));

    expect(await client.readFeed(URL_OF_FEED, NONE)).toEqual({ kind: 'server-error', status: 500 });
  });

  it('answers blocked when fetch rejects with a TypeError while online', async () => {
    const { client } = clientAnswering(() => Promise.reject(new TypeError('Failed to fetch')));

    expect(await client.readFeed(URL_OF_FEED, NONE)).toEqual({ kind: 'blocked' });
  });

  it('answers offline when fetch rejects with a TypeError while offline', async () => {
    const { client } = clientAnswering(
      () => Promise.reject(new TypeError('Failed to fetch')),
      false,
    );

    expect(await client.readFeed(URL_OF_FEED, NONE)).toEqual({ kind: 'offline' });
  });

  it('answers aborted when the signal is aborted', async () => {
    const controller = new AbortController();
    const { client } = clientAnswering(() => Promise.reject(controller.signal.reason));
    controller.abort();

    expect(await client.readFeed(URL_OF_FEED, NONE, controller.signal)).toEqual({
      kind: 'aborted',
    });
  });

  it('answers aborted for an AbortError even without a signal', async () => {
    const { client } = clientAnswering(() =>
      Promise.reject(new DOMException('stop', 'AbortError')),
    );

    expect(await client.readFeed(URL_OF_FEED, NONE)).toEqual({ kind: 'aborted' });
  });

  it('rethrows a failure that is not a network error', async () => {
    const { client } = clientAnswering(() => Promise.reject(new RangeError('bug')));

    await expect(client.readFeed(URL_OF_FEED, NONE)).rejects.toThrow('bug');
  });
});

describe('FetchOpdsClient.readImage', () => {
  it('answers the body as a blob', async () => {
    const { client } = respond(
      new Response(bytes(3), { headers: { 'Content-Type': 'image/png' } }),
    );

    const read = await client.readImage('https://books.example/cover', NONE);

    expect(read.kind === 'success' && read.image.size).toBe(3);
  });

  it('answers not-found for a missing cover', async () => {
    const { client } = respond(new Response('', { status: 404 }));

    expect(await client.readImage('https://books.example/cover', NONE)).toEqual({
      kind: 'not-found',
    });
  });
});

describe('FetchOpdsClient.download', () => {
  it('names the file from filename*, types it as the acquisition and reports progress', async () => {
    const body = streamOf([bytes(40), bytes(60)]);
    const { client } = respond(
      new Response(body, {
        headers: {
          'Content-Length': '100',
          'Content-Disposition': "attachment; filename*=UTF-8''%E6%9C%AC.epub",
        },
      }),
    );
    const progress: (number | null)[] = [];

    const downloaded = await client.download(ACQUISITION, NONE, 'fallback.epub', (value) =>
      progress.push(value),
    );

    expect(downloaded.kind === 'success' && downloaded.file.name).toBe('本.epub');
    expect(downloaded.kind === 'success' && downloaded.file.type).toBe('application/epub+zip');
    expect(downloaded.kind === 'success' && downloaded.file.size).toBe(100);
    expect(progress).toEqual([0, 0.4, 1, 1]);
  });

  it('uses the acquisition length when the response declares none', async () => {
    const { client } = respond(new Response(streamOf([bytes(50)])));
    const progress: (number | null)[] = [];

    await client.download({ ...ACQUISITION, length: 100 }, NONE, 'f.epub', (value) =>
      progress.push(value),
    );

    expect(progress).toEqual([0, 0.5, 1]);
  });

  it('reports null progress when no length is known and falls back to the given name', async () => {
    const { client } = respond(new Response(streamOf([bytes(10), bytes(10)])));
    const progress: (number | null)[] = [];

    const downloaded = await client.download(ACQUISITION, NONE, 'Given Title.epub', (value) =>
      progress.push(value),
    );

    expect(downloaded.kind === 'success' && downloaded.file.name).toBe('Given Title.epub');
    expect(progress.every((value) => value === null)).toBe(true);
    expect(progress.length).toBeGreaterThan(0);
  });

  it('never reports more than one when the body outgrows the declared length', async () => {
    const { client } = respond(
      new Response(streamOf([bytes(30)]), { headers: { 'Content-Length': '10' } }),
    );
    const progress: (number | null)[] = [];

    await client.download(ACQUISITION, NONE, 'f.epub', (value) => progress.push(value));

    expect(Math.max(...progress.filter((value) => value !== null))).toBe(1);
  });

  it('uses the plain filename when there is no filename*', async () => {
    const { client } = respond(
      new Response(bytes(2), {
        headers: { 'Content-Disposition': 'attachment; filename="a b.epub"' },
      }),
    );

    const downloaded = await client.download(ACQUISITION, NONE, 'f.epub', () => undefined);

    expect(downloaded.kind === 'success' && downloaded.file.name).toBe('a b.epub');
  });

  it('answers the outcomes of the request', async () => {
    const { client } = respond(new Response('', { status: 401 }));

    expect(await client.download(ACQUISITION, NONE, 'f.epub', () => undefined)).toEqual({
      kind: 'unauthorized',
    });
  });

  it('answers aborted when the body stream is aborted midway', async () => {
    const controller = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      start(stream) {
        stream.enqueue(bytes(5));
        controller.signal.addEventListener('abort', () => {
          stream.error(controller.signal.reason);
        });
      },
    });
    const { client } = respond(new Response(body));

    const downloaded = await client.download(
      ACQUISITION,
      NONE,
      'f.epub',
      () => controller.abort(),
      controller.signal,
    );

    expect(downloaded).toEqual({ kind: 'aborted' });
  });
});
