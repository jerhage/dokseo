import { describe, expect, it } from 'vitest';
import { isChange } from '../domain/change';
import type { Change } from '../domain/change';
import { contractExample } from '../use-cases/contract-examples';
import { HttpSyncServer } from './http-sync-server';
import type { FetchFunction } from './http-sync-server';

type Recorded = { readonly url: string; readonly init: RequestInit };

const BASE = 'https://sync.example/sync/';
const TOKEN = 'dsk_3f9a1c7e5b2d4a60';
const DEVICE = '00000000-0000-4000-8000-000000000003';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function serverAnswering(answer: () => Promise<Response>) {
  const requests: Recorded[] = [];
  const fetchFunction: FetchFunction = (url, init) => {
    requests.push({ url, init });
    return answer();
  };
  return { server: new HttpSyncServer(fetchFunction), requests };
}

function respond(response: Response) {
  return serverAnswering(() => Promise.resolve(response));
}

function pushedChanges(): readonly Change[] {
  const example = contractExample('push-request', 'one');
  if (typeof example !== 'object' || example === null || !('changes' in example)) return [];
  const { changes } = example;
  return Array.isArray(changes) ? changes.filter(isChange) : [];
}

function headerOf(request: Recorded | undefined, name: string): string | null {
  return new Headers(request?.init.headers).get(name);
}

function bodyOf(request: Recorded | undefined): unknown {
  const body = request?.init.body;
  return typeof body === 'string' ? JSON.parse(body) : undefined;
}

describe('HttpSyncServer requests', () => {
  it('reaches the versioned path under a base that ends with a slash', async () => {
    const { server, requests } = respond(json(contractExample('info', 'info')));

    await server.info('https://sync.example/sync/');

    expect(requests[0]?.url).toBe('https://sync.example/sync/v1/info');
  });

  it('reaches the versioned path under a base without the trailing slash', async () => {
    const { server, requests } = respond(json(contractExample('info', 'info')));

    await server.info('https://sync.example/sync');

    expect(requests[0]?.url).toBe('https://sync.example/sync/v1/info');
  });

  it('reaches the versioned path of a base that is a bare host', async () => {
    const { server, requests } = respond(json(contractExample('info', 'info')));

    await server.info('https://sync.example');

    expect(requests[0]?.url).toBe('https://sync.example/v1/info');
  });

  it('sends the bearer token and omits cookies on an authenticated call', async () => {
    const { server, requests } = respond(json(contractExample('device-list', 'two')));

    await server.listDevices(BASE, TOKEN);

    expect(headerOf(requests[0], 'Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(requests[0]?.init.credentials).toBe('omit');
    expect(requests[0]?.init.method).toBe('GET');
  });

  it('sends no Authorization header on the two calls that need no token', async () => {
    const info = respond(json(contractExample('info', 'info')));
    const created = respond(json(contractExample('device-created', 'created'), 201));

    await info.server.info(BASE);
    await created.server.createDevice(BASE, { username: 'a', password: 'b', deviceName: 'c' });

    expect(headerOf(info.requests[0], 'Authorization')).toBeNull();
    expect(headerOf(created.requests[0], 'Authorization')).toBeNull();
  });

  it('puts the password in the body of createDevice and nowhere else', async () => {
    const { server, requests } = respond(json(contractExample('device-created', 'created'), 201));

    await server.createDevice(BASE, {
      username: 'reader',
      password: 'hunter2',
      deviceName: 'Laptop',
    });

    const [request] = requests;
    expect(request?.init.method).toBe('POST');
    expect(bodyOf(request)).toEqual({
      username: 'reader',
      password: 'hunter2',
      deviceName: 'Laptop',
    });
    expect(headerOf(request, 'Content-Type')).toBe('application/json');
    expect(request?.url).not.toContain('hunter2');
    expect([...new Headers(request?.init.headers).values()].join(' ')).not.toContain('hunter2');
  });

  it('deletes the device named in the path', async () => {
    const { server, requests } = respond(new Response(null, { status: 204 }));

    await server.revokeDevice(BASE, TOKEN, DEVICE);

    expect(requests[0]?.init.method).toBe('DELETE');
    expect(requests[0]?.url).toBe(`https://sync.example/sync/v1/devices/${DEVICE}`);
  });

  it('wraps pushed changes in a changes member', async () => {
    const changes = pushedChanges();
    const { server, requests } = respond(json(contractExample('push-response', 'two')));

    await server.push(BASE, TOKEN, changes);

    expect(changes).toHaveLength(1);
    expect(requests[0]?.init.method).toBe('POST');
    expect(bodyOf(requests[0])).toEqual({ changes });
  });

  it('puts the cursor and the page size in the query of a pull', async () => {
    const { server, requests } = respond(json(contractExample('pull-response', 'empty')));

    await server.pull(BASE, TOKEN, 40, 250);

    expect(requests[0]?.url).toBe('https://sync.example/sync/v1/changes?after=40&limit=250');
  });
});

describe('HttpSyncServer answers', () => {
  it('reads the info example', async () => {
    const { server } = respond(json(contractExample('info', 'info')));

    expect(await server.info(BASE)).toEqual({
      kind: 'success',
      info: { server: 'dokseo-sync', version: '0.1.0', apiVersions: [1] },
    });
  });

  it('reads the device-created example', async () => {
    const { server } = respond(json(contractExample('device-created', 'created'), 201));

    expect(
      await server.createDevice(BASE, { username: 'a', password: 'b', deviceName: 'c' }),
    ).toEqual({
      kind: 'success',
      device: { deviceId: '00000000-0000-4000-8000-000000000002', token: 'dsk_3f9a1c7e5b2d4a60' },
    });
  });

  it('reads the device-list example including a device never seen', async () => {
    const { server } = respond(json(contractExample('device-list', 'two')));

    const listed = await server.listDevices(BASE, TOKEN);

    expect(listed.kind === 'success' && listed.devices.map((device) => device.lastSeenAt)).toEqual([
      1772446000000,
      null,
    ]);
  });

  it('reads a 204 as a revoked device', async () => {
    const { server } = respond(new Response(null, { status: 204 }));

    expect(await server.revokeDevice(BASE, TOKEN, DEVICE)).toEqual({ kind: 'success' });
  });

  it('reads the push-response example', async () => {
    const { server } = respond(json(contractExample('push-response', 'two')));

    expect(await server.push(BASE, TOKEN, pushedChanges())).toEqual({
      kind: 'success',
      accepted: [
        { id: '00000000-0000-4000-8000-000000000001', seq: 7 },
        { id: '00000000-0000-4000-8000-000000000011', seq: 8 },
      ],
    });
  });

  it('reads the pull-response page including a tombstone', async () => {
    const { server } = respond(json(contractExample('pull-response', 'page')));

    const pulled = await server.pull(BASE, TOKEN, 0, 500);

    expect(pulled.kind).toBe('success');
    if (pulled.kind !== 'success') return;
    expect(pulled.page.next).toBe(2);
    expect(pulled.page.more).toBe(false);
    expect(pulled.page.changes.map((change) => [change.seq, change.data === null])).toEqual([
      [1, false],
      [2, true],
    ]);
  });
});

describe('HttpSyncServer failures', () => {
  it('answers unauthorized for 401', async () => {
    const { server } = respond(json(contractExample('error', 'unauthorized'), 401));

    expect(await server.listDevices(BASE, TOKEN)).toEqual({ kind: 'unauthorized' });
  });

  it('answers rate-limited for 429', async () => {
    const { server } = respond(json({ error: { code: 'rate-limited', message: 'slow' } }, 429));

    expect(await server.info(BASE)).toEqual({ kind: 'rate-limited' });
  });

  it('answers not-found for a 404 on revoking a device', async () => {
    const { server } = respond(json({ error: { code: 'not-found', message: 'no' } }, 404));

    expect(await server.revokeDevice(BASE, TOKEN, DEVICE)).toEqual({ kind: 'not-found' });
  });

  it('answers server-error with the status for a 5xx', async () => {
    const { server } = respond(new Response('bad gateway', { status: 502 }));

    expect(await server.pull(BASE, TOKEN, 0, 10)).toEqual({ kind: 'server-error', status: 502 });
  });

  it('answers rejected with the code and index for an invalid change', async () => {
    const { server } = respond(json(contractExample('error', 'invalid-change'), 400));

    expect(await server.push(BASE, TOKEN, pushedChanges())).toEqual({
      kind: 'rejected',
      code: 'invalid-change',
      index: 3,
    });
  });

  it('answers rejected with no index for a device mismatch', async () => {
    const { server } = respond(
      json({ error: { code: 'device-mismatch', message: 'not your device' } }, 403),
    );

    expect(await server.push(BASE, TOKEN, pushedChanges())).toEqual({
      kind: 'rejected',
      code: 'device-mismatch',
      index: null,
    });
  });

  it('answers rejected as too large for a 413 whose body is not JSON', async () => {
    const { server } = respond(new Response('<html>too big</html>', { status: 413 }));

    expect(await server.push(BASE, TOKEN, pushedChanges())).toEqual({
      kind: 'rejected',
      code: 'too-large',
      index: null,
    });
  });

  it('answers unreadable-response for a 400 whose body is not the error shape', async () => {
    const { server } = respond(new Response('<html>bad</html>', { status: 400 }));

    expect(await server.pull(BASE, TOKEN, 0, 10)).toEqual({ kind: 'unreadable-response' });
  });

  it('answers unreadable-response for a status the contract does not list for the call', async () => {
    const { server } = respond(new Response('<html>nothing here</html>', { status: 404 }));

    expect(await server.info(BASE)).toEqual({ kind: 'unreadable-response' });
  });

  it('answers unreadable-response for a status outside every contract answer', async () => {
    const { server } = respond(new Response('teapot', { status: 418 }));

    expect(await server.listDevices(BASE, TOKEN)).toEqual({ kind: 'unreadable-response' });
  });

  it('answers unreadable-response for a 200 whose body is not JSON', async () => {
    const { server } = respond(new Response('<html>login</html>', { status: 200 }));

    expect(await server.info(BASE)).toEqual({ kind: 'unreadable-response' });
  });

  it('answers unreadable-response for a body that is not the contract shape, on every call', async () => {
    const wrong = () => json({ unexpected: true });

    expect(await serverAnswering(() => Promise.resolve(wrong())).server.info(BASE)).toEqual({
      kind: 'unreadable-response',
    });
    expect(
      await serverAnswering(() => Promise.resolve(wrong())).server.createDevice(BASE, {
        username: 'a',
        password: 'b',
        deviceName: 'c',
      }),
    ).toEqual({ kind: 'unreadable-response' });
    expect(
      await serverAnswering(() => Promise.resolve(wrong())).server.listDevices(BASE, TOKEN),
    ).toEqual({ kind: 'unreadable-response' });
    expect(
      await serverAnswering(() => Promise.resolve(wrong())).server.push(BASE, TOKEN, []),
    ).toEqual({ kind: 'unreadable-response' });
    expect(
      await serverAnswering(() => Promise.resolve(wrong())).server.pull(BASE, TOKEN, 0, 1),
    ).toEqual({ kind: 'unreadable-response' });
  });

  it('answers unreadable-response for a pulled change of an unknown kind', async () => {
    const page = {
      changes: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          kind: 'bookmark',
          recordId: 'x',
          data: null,
          updatedAt: 1,
          deviceId: DEVICE,
          seq: 1,
          receivedAt: 1,
        },
      ],
      next: 1,
      more: false,
    };
    const { server } = respond(json(page));

    expect(await server.pull(BASE, TOKEN, 0, 10)).toEqual({ kind: 'unreadable-response' });
  });

  it('answers unreadable-response for a pulled change without its seq', async () => {
    const page = {
      changes: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          kind: 'tag',
          recordId: 'x',
          data: null,
          updatedAt: 1,
          deviceId: DEVICE,
          receivedAt: 1,
        },
      ],
      next: 1,
      more: false,
    };
    const { server } = respond(json(page));

    expect(await server.pull(BASE, TOKEN, 0, 10)).toEqual({ kind: 'unreadable-response' });
  });

  it('answers offline when fetch fails with a network TypeError', async () => {
    const { server } = serverAnswering(() => Promise.reject(new TypeError('Failed to fetch')));

    expect(await server.info(BASE)).toEqual({ kind: 'offline' });
  });

  it('rethrows a failure that is not a network error', async () => {
    const { server } = serverAnswering(() => Promise.reject(new RangeError('broken')));

    await expect(server.info(BASE)).rejects.toThrow('broken');
  });
});
