import { describe, expect, it } from 'vitest';
import {
  SHELL_CACHE_PREFIX,
  isStaleShellCache,
  shellAssets,
  shellCacheName,
  shellDocument,
} from './shell-cache';

describe('shellCacheName', () => {
  it('names the cache with the prefix and the build version', () => {
    expect(shellCacheName('1790000000')).toBe(`${SHELL_CACHE_PREFIX}1790000000`);
  });
});

describe('isStaleShellCache', () => {
  const current = shellCacheName('2');

  it('reports an older shell cache as stale', () => {
    expect(isStaleShellCache(shellCacheName('1'), current)).toBe(true);
  });

  it('keeps the current shell cache', () => {
    expect(isStaleShellCache(current, current)).toBe(false);
  });

  it('leaves every cache another owner named alone', () => {
    for (const name of ['transformers-cache', 'onnx-wasm', 'reader-models', 'shell-1', '']) {
      expect(isStaleShellCache(name, current)).toBe(false);
    }
  });
});

describe('shellDocument', () => {
  it('names the root of the base path, never index.html', () => {
    expect(shellDocument('')).toBe('/');
    expect(shellDocument('/reader')).toBe('/reader/');
  });
});

describe('shellAssets', () => {
  it('lists the document, every build file and the static files the app loads', () => {
    const assets = shellAssets(
      '',
      [
        '/_app/immutable/entry/start.js',
        '/_app/immutable/assets/0.css',
        '/_app/immutable/assets/geist.BgDaEnEv.woff2',
      ],
      ['/_headers', '/licenses.txt', '/robots.txt', '/.well-known/security.txt', '/favicon.svg'],
    );

    expect(assets).toEqual([
      '/',
      '/_app/immutable/entry/start.js',
      '/_app/immutable/assets/0.css',
      '/_app/immutable/assets/geist.BgDaEnEv.woff2',
      '/favicon.svg',
    ]);
  });

  it('keeps the web app manifest and its icons, so an installed app opens offline', () => {
    const installFiles = [
      '/manifest.webmanifest',
      '/icons/icon-192.png',
      '/icons/icon-maskable-512.png',
      '/icons/apple-touch-icon.png',
    ];

    expect(shellAssets('', [], installFiles)).toEqual(['/', ...installFiles]);
  });
});
