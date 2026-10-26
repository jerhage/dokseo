import type { Change } from '../domain/change';
import type {
  CreateDeviceResult,
  DeviceRequest,
  InfoResult,
  ListDevicesResult,
  PullResult,
  PushResult,
  RevokeDeviceResult,
  ServerFailure,
  SyncServer,
} from '../domain/sync-server';
import {
  parseAccepted,
  parseCreatedDevice,
  parseDeviceList,
  parseErrorBody,
  parseInfo,
  parsePullPage,
} from './sync-response';

type FetchFunction = (url: string, init: RequestInit) => Promise<Response>;

type Method = 'GET' | 'POST' | 'DELETE';

type Call = {
  readonly method: Method;
  readonly path: string;
  readonly token: string | null;
  readonly body?: unknown;
  readonly search?: Readonly<Record<string, string>>;
};

type Failure<K extends ServerFailure['kind']> = Extract<ServerFailure, { readonly kind: K }>;

type Sent = { readonly kind: 'response'; readonly response: Response } | Failure<'offline'>;

type Body =
  | { readonly kind: 'body'; readonly body: unknown }
  | Failure<'offline' | 'unreadable-response'>;

type Exchanged<T> = { readonly kind: 'done'; readonly value: T } | ServerFailure;

type Parse<T> = (body: unknown) => T | null;

const OFFLINE = { kind: 'offline' } as const;
const UNAUTHORIZED = { kind: 'unauthorized' } as const;
const RATE_LIMITED = { kind: 'rate-limited' } as const;
const NOT_FOUND = { kind: 'not-found' } as const;
const UNREADABLE = { kind: 'unreadable-response' } as const;

const NO_CONTENT = 204;
const FIRST_SERVER_ERROR = 500;
const END_OF_SERVER_ERRORS = 600;

const INFO_FAILURES = ['offline', 'rate-limited', 'server-error', 'unreadable-response'] as const;
const CREATE_DEVICE_FAILURES = [
  'offline',
  'unauthorized',
  'rate-limited',
  'rejected',
  'server-error',
  'unreadable-response',
] as const;
const LIST_DEVICES_FAILURES = [
  'offline',
  'unauthorized',
  'rate-limited',
  'server-error',
  'unreadable-response',
] as const;
const REVOKE_DEVICE_FAILURES = [
  'offline',
  'unauthorized',
  'rate-limited',
  'not-found',
  'server-error',
  'unreadable-response',
] as const;

function within<K extends ServerFailure['kind']>(
  failure: ServerFailure,
  kinds: readonly K[],
): Failure<K> | Failure<'unreadable-response'> {
  return listed(failure, kinds) ? failure : UNREADABLE;
}

function listed<K extends ServerFailure['kind']>(
  failure: ServerFailure,
  kinds: readonly K[],
): failure is Failure<K> {
  return kinds.some((kind) => kind === failure.kind);
}

function endpoint(base: string, path: string, search: Readonly<Record<string, string>>): URL {
  const root = new URL(base);
  if (!root.pathname.endsWith('/')) root.pathname = `${root.pathname}/`;
  const target = new URL(path, root);
  for (const [name, value] of Object.entries(search)) target.searchParams.set(name, value);
  return target;
}

async function readBody(response: Response): Promise<Body> {
  try {
    const body: unknown = await response.json();
    return { kind: 'body', body };
  } catch (error) {
    if (error instanceof SyntaxError) return UNREADABLE;
    if (error instanceof TypeError) return OFFLINE;
    throw error;
  }
}

async function rejection(response: Response): Promise<ServerFailure> {
  const read = await readBody(response);
  if (read.kind !== 'body') return read;
  const parsed = parseErrorBody(read.body);
  if (parsed === null) return UNREADABLE;
  return { kind: 'rejected', code: parsed.code, index: parsed.index };
}

async function failureOf(response: Response): Promise<ServerFailure> {
  const { status } = response;
  if (status === 401) return UNAUTHORIZED;
  if (status === 429) return RATE_LIMITED;
  if (status === 404) return NOT_FOUND;
  if (status >= FIRST_SERVER_ERROR && status < END_OF_SERVER_ERRORS) {
    return { kind: 'server-error', status };
  }
  if (status === 413) return { kind: 'rejected', code: 'too-large', index: null };
  if (status === 400 || status === 403) return rejection(response);
  return UNREADABLE;
}

class HttpSyncServer implements SyncServer {
  readonly #fetch: FetchFunction;

  constructor(fetchFunction: FetchFunction) {
    this.#fetch = fetchFunction;
  }

  async info(url: string): Promise<InfoResult> {
    const exchanged = await this.#exchange(
      url,
      { method: 'GET', path: 'v1/info', token: null },
      parseInfo,
    );
    if (exchanged.kind !== 'done') return within(exchanged, INFO_FAILURES);
    return { kind: 'success', info: exchanged.value };
  }

  async createDevice(url: string, request: DeviceRequest): Promise<CreateDeviceResult> {
    const exchanged = await this.#exchange(
      url,
      { method: 'POST', path: 'v1/devices', token: null, body: request },
      parseCreatedDevice,
    );
    if (exchanged.kind !== 'done') return within(exchanged, CREATE_DEVICE_FAILURES);
    return { kind: 'success', device: exchanged.value };
  }

  async listDevices(url: string, token: string): Promise<ListDevicesResult> {
    const exchanged = await this.#exchange(
      url,
      { method: 'GET', path: 'v1/devices', token },
      parseDeviceList,
    );
    if (exchanged.kind !== 'done') return within(exchanged, LIST_DEVICES_FAILURES);
    return { kind: 'success', devices: exchanged.value };
  }

  async revokeDevice(url: string, token: string, deviceId: string): Promise<RevokeDeviceResult> {
    const exchanged = await this.#exchange(
      url,
      { method: 'DELETE', path: `v1/devices/${encodeURIComponent(deviceId)}`, token },
      () => true,
    );
    if (exchanged.kind !== 'done') return within(exchanged, REVOKE_DEVICE_FAILURES);
    return { kind: 'success' };
  }

  async push(url: string, token: string, changes: readonly Change[]): Promise<PushResult> {
    const exchanged = await this.#exchange(
      url,
      { method: 'POST', path: 'v1/changes', token, body: { changes } },
      parseAccepted,
    );
    if (exchanged.kind === 'done') return { kind: 'success', accepted: exchanged.value };
    if (exchanged.kind === 'not-found') return UNREADABLE;
    return exchanged;
  }

  async pull(url: string, token: string, after: number, limit: number): Promise<PullResult> {
    const exchanged = await this.#exchange(
      url,
      {
        method: 'GET',
        path: 'v1/changes',
        token,
        search: { after: String(after), limit: String(limit) },
      },
      parsePullPage,
    );
    if (exchanged.kind === 'done') return { kind: 'success', page: exchanged.value };
    if (exchanged.kind === 'not-found') return UNREADABLE;
    return exchanged;
  }

  async #exchange<T>(url: string, call: Call, parse: Parse<T>): Promise<Exchanged<T>> {
    const sent = await this.#send(url, call);
    if (sent.kind !== 'response') return sent;
    const { response } = sent;
    if (!response.ok) return failureOf(response);
    const read: Body =
      response.status === NO_CONTENT ? { kind: 'body', body: null } : await readBody(response);
    if (read.kind !== 'body') return read;
    const value = parse(read.body);
    if (value === null) return UNREADABLE;
    return { kind: 'done', value };
  }

  async #send(url: string, call: Call): Promise<Sent> {
    const target = endpoint(url, call.path, call.search ?? {});
    const headers = new Headers({ Accept: 'application/json' });
    if (call.token !== null) headers.set('Authorization', `Bearer ${call.token}`);
    const init: RequestInit = { method: call.method, headers, credentials: 'omit' };
    if (call.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      init.body = JSON.stringify(call.body);
    }
    try {
      const response = await this.#fetch(target.href, init);
      return { kind: 'response', response };
    } catch (error) {
      if (error instanceof TypeError) return OFFLINE;
      throw error;
    }
  }
}

export { HttpSyncServer };
export type { FetchFunction };
