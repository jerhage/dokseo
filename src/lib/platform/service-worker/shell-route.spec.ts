import { describe, expect, it } from 'vitest';
import { shellRoute } from './shell-route';
import type { ShellRequest, ShellScope } from './shell-route';

const ORIGIN = 'https://reader.test';

const scope: ShellScope = {
  origin: ORIGIN,
  base: '',
  precached: new Set(['/', '/fonts/geist.woff2']),
};

function get(url: string, mode = 'cors'): ShellRequest {
  return { method: 'GET', mode, url };
}

describe('shellRoute', () => {
  it('answers an immutable build file from the cache first', () => {
    expect(shellRoute(get(`${ORIGIN}/_app/immutable/chunks/a.js`), scope)).toEqual({
      kind: 'cache-first',
    });
    expect(shellRoute(get(`${ORIGIN}/_app/immutable/workers/ocr.worker-x.js`), scope)).toEqual({
      kind: 'cache-first',
    });
  });

  it('answers a precached static file from the cache first', () => {
    expect(shellRoute(get(`${ORIGIN}/fonts/geist.woff2`), scope)).toEqual({ kind: 'cache-first' });
  });

  it('asks the network first for every navigation', () => {
    for (const path of ['/', '/read/abc', '/tags', '/settings/storage']) {
      expect(shellRoute(get(`${ORIGIN}${path}`, 'navigate'), scope)).toEqual({
        kind: 'network-first',
      });
    }
  });

  it('passes a cross-origin request through untouched', () => {
    for (const url of [
      'https://huggingface.co/model/resolve/main/encoder.onnx',
      'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm.wasm',
    ]) {
      expect(shellRoute(get(url), scope)).toEqual({ kind: 'pass-through' });
      expect(shellRoute(get(url, 'navigate'), scope)).toEqual({ kind: 'pass-through' });
    }
  });

  it('passes a request other than GET through untouched', () => {
    for (const method of ['POST', 'PUT', 'HEAD', 'DELETE']) {
      expect(
        shellRoute({ method, mode: 'cors', url: `${ORIGIN}/_app/immutable/chunks/a.js` }, scope),
      ).toEqual({ kind: 'pass-through' });
    }
  });

  it('passes a same-origin file outside the shell through untouched', () => {
    for (const path of ['/_app/version.json', '/licenses.txt', '/fonts/geist.OFL.txt']) {
      expect(shellRoute(get(`${ORIGIN}${path}`), scope)).toEqual({ kind: 'pass-through' });
    }
  });

  it('reads the immutable folder under the base path', () => {
    const based: ShellScope = { ...scope, base: '/reader' };

    expect(shellRoute(get(`${ORIGIN}/reader/_app/immutable/chunks/a.js`), based)).toEqual({
      kind: 'cache-first',
    });
    expect(shellRoute(get(`${ORIGIN}/_app/immutable/chunks/a.js`), based)).toEqual({
      kind: 'pass-through',
    });
  });
});
