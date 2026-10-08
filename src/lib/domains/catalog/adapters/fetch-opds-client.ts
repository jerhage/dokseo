import { basicAuthorization } from '../domain/basic-authorization';
import { dispositionFileName } from '../domain/download-file-name';
import type {
  CatalogCredentials,
  ClientFailure,
  DownloadProgress,
  DownloadResult,
  OpdsClient,
  ReadFeedResult,
  ReadImageResult,
} from '../domain/opds-client';
import type { Acquisition } from '../domain/remote-publication';

type FetchFunction = (url: string, init: RequestInit) => Promise<Response>;

type Fetched = { readonly kind: 'response'; readonly response: Response } | ClientFailure;

type Settled<T> = { readonly kind: 'done'; readonly value: T } | ClientFailure;

const UNAUTHORIZED_STATUSES: ReadonlySet<number> = new Set([401, 403]);
const NOT_FOUND_STATUS = 404;

function headersFor(credentials: CatalogCredentials): Headers {
  const headers = new Headers();
  if (credentials.kind === 'basic') {
    headers.set('Authorization', basicAuthorization(credentials.username, credentials.password));
  }
  return headers;
}

function declaredLength(headers: Headers): number | null {
  const declared = Number(headers.get('Content-Length'));
  return Number.isSafeInteger(declared) && declared > 0 ? declared : null;
}

async function collectBody(
  response: Response,
  total: number | null,
  onProgress: DownloadProgress,
): Promise<readonly BlobPart[]> {
  const body = response.body;
  if (body === null) {
    const whole = await response.blob();
    onProgress(total === null ? null : 1);
    return [whole];
  }
  const reader = body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  onProgress(total === null ? null : 0);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress(total === null ? null : Math.min(1, received / total));
  }
  onProgress(total === null ? null : 1);
  return chunks;
}

class FetchOpdsClient implements OpdsClient {
  readonly #fetch: FetchFunction;
  readonly #onLine: () => boolean;

  constructor(fetchFunction: FetchFunction, onLine: () => boolean) {
    this.#fetch = fetchFunction;
    this.#onLine = onLine;
  }

  async readFeed(
    url: string,
    credentials: CatalogCredentials,
    signal?: AbortSignal,
  ): Promise<ReadFeedResult> {
    const fetched = await this.#fetched(url, credentials, signal);
    if (fetched.kind !== 'response') return fetched;
    const text = await this.#settle(fetched.response.text(), signal);
    if (text.kind !== 'done') return text;
    return { kind: 'success', text: text.value };
  }

  async readImage(
    url: string,
    credentials: CatalogCredentials,
    signal?: AbortSignal,
  ): Promise<ReadImageResult> {
    const fetched = await this.#fetched(url, credentials, signal);
    if (fetched.kind !== 'response') return fetched;
    const image = await this.#settle(fetched.response.blob(), signal);
    if (image.kind !== 'done') return image;
    return { kind: 'success', image: image.value };
  }

  async download(
    acquisition: Acquisition,
    credentials: CatalogCredentials,
    fallbackName: string,
    onProgress: DownloadProgress,
    signal?: AbortSignal,
  ): Promise<DownloadResult> {
    const fetched = await this.#fetched(acquisition.href, credentials, signal);
    if (fetched.kind !== 'response') return fetched;
    const { response } = fetched;
    const total = declaredLength(response.headers) ?? acquisition.length;
    const chunks = await this.#settle(collectBody(response, total, onProgress), signal);
    if (chunks.kind !== 'done') return chunks;
    const name = dispositionFileName(response.headers.get('Content-Disposition')) ?? fallbackName;
    const file = new File([...chunks.value], name, { type: acquisition.mediaType });
    return { kind: 'success', file };
  }

  async #fetched(
    url: string,
    credentials: CatalogCredentials,
    signal: AbortSignal | undefined,
  ): Promise<Fetched> {
    const init: RequestInit = { credentials: 'omit', headers: headersFor(credentials) };
    if (signal !== undefined) init.signal = signal;
    const settled = await this.#settle(this.#fetch(url, init), signal);
    if (settled.kind !== 'done') return settled;
    const response = settled.value;
    if (response.ok) return { kind: 'response', response };
    if (UNAUTHORIZED_STATUSES.has(response.status)) return { kind: 'unauthorized' };
    if (response.status === NOT_FOUND_STATUS) return { kind: 'not-found' };
    return { kind: 'server-error', status: response.status };
  }

  async #settle<T>(work: Promise<T>, signal: AbortSignal | undefined): Promise<Settled<T>> {
    try {
      const value = await work;
      return { kind: 'done', value };
    } catch (error) {
      return this.#failureOf(error, signal);
    }
  }

  #failureOf(error: unknown, signal: AbortSignal | undefined): ClientFailure {
    if (signal?.aborted === true) return { kind: 'aborted' };
    if (error instanceof DOMException && error.name === 'AbortError') return { kind: 'aborted' };
    if (error instanceof TypeError) return { kind: this.#onLine() ? 'blocked' : 'offline' };
    throw error;
  }
}

export { FetchOpdsClient };
export type { FetchFunction };
